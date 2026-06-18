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

// Google Sign-In
function handleGoogleCredential(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]))
  const email = payload.email
  const name = payload.name || email.split('@')[0]
  const picture = payload.picture

  const username = email.split('@')[0] + '_google'

  if (!localStorage.getItem(username)) {
    localStorage.setItem(username, 'google_oauth')
    localStorage.setItem('user_' + username, JSON.stringify({
      email: email,
      profilePic: picture || '',
      googleName: name
    }))
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    if (!users.includes(username)) { users.push(username) }
    localStorage.setItem('registeredUsers', JSON.stringify(users))
  }

  localStorage.setItem('loggedInUser', username)
  window.location.href = '../Bilerdia/Home/home.html'
}

if (typeof GOOGLE_CLIENT_ID !== 'undefined' && GOOGLE_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE') {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  })
  google.accounts.id.renderButton(
    document.getElementById('google-btn'),
    { type: 'standard', shape: 'rectangular', theme: 'outline', text: 'signin_with', size: 'large' }
  )
}
