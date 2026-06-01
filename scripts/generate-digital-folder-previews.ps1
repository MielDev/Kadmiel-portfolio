Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\public\dossier-numerique')
$previewRootPath = Join-Path $PSScriptRoot '..\public\dossier-numerique-preview'

if (Test-Path -LiteralPath $previewRootPath) {
  Remove-Item -LiteralPath $previewRootPath -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $previewRootPath | Out-Null

function Escape-Html([string]$value) {
  if ($null -eq $value) { return '' }
  return [System.Net.WebUtility]::HtmlEncode($value)
}

function Read-ZipEntryText($zip, [string]$entryName) {
  $entry = $zip.Entries | Where-Object { $_.FullName -eq $entryName } | Select-Object -First 1
  if (-not $entry) { return '' }

  $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Convert-XmlToText([string]$xml) {
  if ([string]::IsNullOrWhiteSpace($xml)) { return '' }

  $text = $xml -replace '</w:p[^>]*>', "`n"
  $text = $text -replace '</a:p[^>]*>', "`n"
  $text = $text -replace '</row[^>]*>', "`n"
  $text = [regex]::Replace($text, '<[^>]+>', ' ')
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  $text = [regex]::Replace($text, "[`t ]+", ' ')
  $text = [regex]::Replace($text, " *(`r`n|`n|`r) *", "`n")
  $text = [regex]::Replace($text, "(`n){3,}", "`n`n")
  return $text.Trim()
}

function Get-OfficeText([System.IO.FileInfo]$file) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
  try {
    switch ($file.Extension.ToLowerInvariant()) {
      '.docx' {
        return Convert-XmlToText (Read-ZipEntryText $zip 'word/document.xml')
      }
      '.pptx' {
        $entries = $zip.Entries |
          Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' } |
          Sort-Object {
            [int]([regex]::Match($_.FullName, 'slide(\d+)\.xml').Groups[1].Value)
          }

        $parts = @()
        $slideNumber = 1
        foreach ($entry in $entries) {
          $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
          try {
            $content = Convert-XmlToText $reader.ReadToEnd()
            if ($content) {
              $parts += "Diapositive $slideNumber`n$content"
            }
          } finally {
            $reader.Dispose()
          }
          $slideNumber++
        }
        return ($parts -join "`n`n")
      }
      '.xlsx' {
        $sharedXml = Read-ZipEntryText $zip 'xl/sharedStrings.xml'
        $strings = @()
        foreach ($match in [regex]::Matches($sharedXml, '<t[^>]*>(.*?)</t>', 'Singleline')) {
          $strings += [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
        }

        $sheetEntries = $zip.Entries |
          Where-Object { $_.FullName -match '^xl/worksheets/sheet\d+\.xml$' } |
          Sort-Object FullName

        $parts = @()
        $sheetNumber = 1
        foreach ($entry in $sheetEntries) {
          $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
          try {
            $xml = $reader.ReadToEnd()
            $values = @()
            foreach ($cell in [regex]::Matches($xml, '<c[^>]*(?:t="(?<type>[^"]+)")?[^>]*>.*?<v>(?<value>.*?)</v>.*?</c>', 'Singleline')) {
              $type = $cell.Groups['type'].Value
              $value = [System.Net.WebUtility]::HtmlDecode($cell.Groups['value'].Value)
              if ($type -eq 's' -and $value -match '^\d+$') {
                $index = [int]$value
                if ($index -lt $strings.Count) { $value = $strings[$index] }
              }
              if (-not [string]::IsNullOrWhiteSpace($value)) { $values += $value }
            }
            if ($values.Count -gt 0) {
              $parts += "Feuille $sheetNumber`n$($values -join ' | ')"
            }
          } finally {
            $reader.Dispose()
          }
          $sheetNumber++
        }

        if ($parts.Count -eq 0 -and $strings.Count -gt 0) {
          return ($strings -join "`n")
        }
        return ($parts -join "`n`n")
      }
    }
  } finally {
    $zip.Dispose()
  }

  return ''
}

function Get-ZipListing([System.IO.FileInfo]$file) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
  try {
    $entries = $zip.Entries | Sort-Object FullName | ForEach-Object {
      if ($_.FullName.EndsWith('/')) {
        "Dossier : $($_.FullName)"
      } else {
        "Fichier : $($_.FullName) ($($_.Length) octets)"
      }
    }
    return ($entries -join "`n")
  } finally {
    $zip.Dispose()
  }
}

function Write-PreviewPage([System.IO.FileInfo]$file, [string]$relativePath, [string]$kind, [string]$bodyHtml) {
  $outputPath = Join-Path $previewRootPath ($relativePath + '.html')
  $outputDirectory = Split-Path -Parent $outputPath
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

  $title = Escape-Html $file.Name
  $kindLabel = Escape-Html $kind
  $sourcePath = Escape-Html $relativePath

  $html = @"
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$title</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #070b14;
      color: #f8fafc;
      font-family: Arial, sans-serif;
      line-height: 1.65;
    }
    header {
      padding: 2rem min(6vw, 4rem);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      background: linear-gradient(135deg, rgba(124,58,237,0.18), transparent 42%), #070b14;
    }
    a { color: #ff3b3b; }
    .back { display: inline-block; margin-bottom: 1.4rem; text-decoration: none; font-weight: 700; }
    .eyebrow { color: #ff3b3b; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { margin: 0.35rem 0; font-size: clamp(1.7rem, 4vw, 3rem); line-height: 1.1; }
    .meta { color: #9ca3af; overflow-wrap: anywhere; }
    main { width: min(1040px, calc(100% - 2rem)); margin: 0 auto; padding: 2rem 0 4rem; }
    .preview {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      background: #0d1320;
      overflow: hidden;
    }
    .preview-title {
      margin: 0;
      padding: 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      color: #cbd5e1;
      background: #111827;
      font-size: 0.9rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    pre {
      margin: 0;
      padding: 1.25rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: #e5e7eb;
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.92rem;
    }
    .note { color: #9ca3af; margin-top: 1rem; }
    .font-sample { padding: 1.25rem; }
    .font-sample p { margin: 0 0 1rem; }
    .sample-large { font-size: clamp(2rem, 7vw, 5rem); line-height: 1.1; }
  </style>
</head>
<body>
  <header>
    <a class="back" href="/dossier-numerique-cs-sno">Retour au dossier numérique</a>
    <div class="eyebrow">Aperçu navigateur</div>
    <h1>$title</h1>
    <div class="meta">$kindLabel · $sourcePath</div>
  </header>
  <main>
    $bodyHtml
  </main>
</body>
</html>
"@

  Set-Content -LiteralPath $outputPath -Value $html -Encoding UTF8
}

$previewExtensions = @('.docx', '.pptx', '.xlsx', '.zip', '.ttf')

Get-ChildItem -LiteralPath $sourceRoot -Recurse -File |
  Where-Object { $previewExtensions -contains $_.Extension.ToLowerInvariant() } |
  ForEach-Object {
    $relative = $_.FullName.Substring($sourceRoot.Path.Length).TrimStart('\')
    $relativeUrl = $relative -replace '\\', '/'
    $extension = $_.Extension.ToLowerInvariant()

    if ($extension -in @('.docx', '.pptx', '.xlsx')) {
      $text = Get-OfficeText $_
      if ([string]::IsNullOrWhiteSpace($text)) {
        $text = "Aucun texte exploitable n'a été détecté dans ce document."
      }
      $body = "<section class=""preview""><h2 class=""preview-title"">Contenu extrait</h2><pre>$(Escape-Html $text)</pre></section><p class=""note"">Cet aperçu HTML permet de consulter le document dans le navigateur sans télécharger le fichier original.</p>"
      Write-PreviewPage $_ $relative 'Document Office' $body
    } elseif ($extension -eq '.zip') {
      $listing = Get-ZipListing $_
      $body = "<section class=""preview""><h2 class=""preview-title"">Contenu de l'archive</h2><pre>$(Escape-Html $listing)</pre></section><p class=""note"">L'archive est présentée sous forme de liste pour éviter le téléchargement automatique.</p>"
      Write-PreviewPage $_ $relative 'Archive ZIP' $body
    } elseif ($extension -eq '.ttf') {
      $fontUrl = '/dossier-numerique/' + ($relativeUrl -replace ' ', '%20')
      $body = @"
<style>
  @font-face { font-family: "DigitalFolderPreviewFont"; src: url("$fontUrl") format("truetype"); }
  .font-sample { font-family: "DigitalFolderPreviewFont", Arial, sans-serif; }
</style>
<section class="preview">
  <h2 class="preview-title">Aperçu de la police</h2>
  <div class="font-sample">
    <p class="sample-large">Aa Bb Cc 123</p>
    <p>Contribution à la présence en ligne de l'organisation</p>
    <p>Services numériques aux organisations</p>
  </div>
</section>
"@
      Write-PreviewPage $_ $relative 'Police de caractères' $body
    }
  }

$count = (Get-ChildItem -LiteralPath $previewRootPath -Recurse -File | Measure-Object).Count
Write-Output "Generated previews: $count"
