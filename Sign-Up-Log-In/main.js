const signupElements = [document.getElementById('haveAccount'), document.getElementById('signup')]
let isOnSignUp = true
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const button = document.getElementById('register-log')

if (localStorage.getItem('loggedInUser')) {
  window.location.href = '../Bilerdia/Home/home.html'
}

document.getElementById('haveAccount').addEventListener('click', () => {
  if (isOnSignUp === true) {
    signupElements[0].textContent = "Don't have an account? Sign Up";
    signupElements[1].textContent = "Log In";
    button.textContent = "Log In";
    isOnSignUp = false;
  } else {
    signupElements[0].textContent = "Have an account? Log In";
    signupElements[1].textContent = "Sign Up";
    button.textContent = "Register";
    isOnSignUp = true;
  }
})

button.addEventListener('click', () => {
  const username = usernameInput.value.trim()
  const password = passwordInput.value.trim()

  if (!username || !password) {
    alert('Please enter both username and password.')
    return
  }

  if (isOnSignUp) {
    if (localStorage.getItem(username)) {
      alert('Username already exists. Please log in instead.')
      return
    }
    localStorage.setItem(username, password)
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    if (!users.includes(username)) { users.push(username) }
    localStorage.setItem('registeredUsers', JSON.stringify(users))
    alert('Account created successfully! You can now log in.')
    signupElements[0].textContent = "Don't have an account? Sign Up";
    signupElements[1].textContent = "Log In";
    button.textContent = "Log In";
    isOnSignUp = false
  } else {
    const storedPassword = localStorage.getItem(username)
    if (!storedPassword) {
      alert('Username not found. Please sign up first.')
      return
    }
    if (storedPassword !== password) {
      alert('Incorrect password.')
      return
    }
    localStorage.setItem('loggedInUser', username)
    window.location.href = '../Bilerdia/Home/home.html'
  }
})
