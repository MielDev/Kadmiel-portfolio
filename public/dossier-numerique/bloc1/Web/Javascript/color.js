let compteur = 0;
function suivant() {
    compteur = compteur + 1;
    let v = document.getElementById("valeur");
    v.innerHTML = compteur;
}


function bgColor() {
	r = Math.random()*255;
	g = Math.random()*255;
	b = Math.random()*255;
    var rndCol = `rgb(${r},${g},${b})`;
    document.body.style.backgroundColor = rndCol;
}


let b = document.getElementById("bouton");
b.addEventListener("click", suivant);
b.addEventListener("click", bgColor);
