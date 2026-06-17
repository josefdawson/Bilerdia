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

document.getElementById('forgot-pw').addEventListener('click', () => {
  const username = prompt('Enter your username:')
  if (!username || !username.trim()) return

  if (!localStorage.getItem(username.trim())) {
    alert('Username not found.')
    return
  }

  const userData = JSON.parse(localStorage.getItem('user_' + username.trim()) || '{}')
  if (!userData.email) {
    alert('No email provided on the account, please create a new account.')
    return
  }

  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  alert('A password reset code has been sent to ' + userData.email + '\n\n(Simulated — your code is: ' + code + ')')

  const entered = prompt('Enter the reset code sent to your email:')
  if (entered !== code) {
    alert('Invalid code.')
    return
  }

  const newPw = prompt('Enter your new password:')
  if (newPw && newPw.trim()) {
    localStorage.setItem(username.trim(), newPw.trim())
    alert('Password reset successfully! You can now log in.')
  }
})
