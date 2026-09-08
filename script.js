function toggleMenu(){
  document.getElementById('mobileMenu').classList.toggle('open');
}
function sendMail(event){
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();
  const subject = encodeURIComponent('MatrixFlowAI enquiry from ' + name);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  window.location.href = `mailto:admin@matrixflowai.in?subject=${subject}&body=${body}`;
}
