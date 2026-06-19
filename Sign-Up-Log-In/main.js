const signupElements = [document.getElementById('haveAccount'), document.getElementById('signup')]
let isOnSignUp = true
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const button = document.getElementById('register-log')

if (localStorage.getItem('loggedInUser')) {
  window.location.href = 'Home/home.html?user=' + encodeURIComponent(localStorage.getItem('loggedInUser'))
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

button.addEventListener('click', async () => {
  const username = usernameInput.value.trim()
  const password = passwordInput.value.trim()

  if (!username || !password) {
    alert('Please enter both username and password.')
    return
  }

  if (isOnSignUp) {
    const exists = await supabaseUserExists(username)
    if (exists) {
      alert('Username already exists. Please log in instead.')
      return
    }
    const err = await supabaseRegister(username, password)
    if (err) {
      alert('Registration failed: ' + err)
      return
    }
    alert('Account created successfully! You can now log in.')
    signupElements[0].textContent = "Don't have an account? Sign Up";
    signupElements[1].textContent = "Log In";
    button.textContent = "Log In";
    isOnSignUp = false
  } else {
    const user = await supabaseLogin(username, password)
    if (!user) {
      const exists = await supabaseUserExists(username)
      if (!exists) {
        alert('Username not found. Please sign up first.')
      } else {
        alert('Incorrect password.')
      }
      return
    }
    localStorage.setItem('loggedInUser', username)
    window.location.href = 'Bilerdia/Home/home.html?user=' + encodeURIComponent(username)
  }
})

function handleGoogleCredential(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]))
  const email = payload.email
  const name = payload.name || email.split('@')[0]
  const picture = payload.picture
  const username = email.split('@')[0] + '_google'

  supabaseUserExists(username).then(async (exists) => {
    if (!exists) {
      const err = await supabaseRegister(username, 'google_oauth')
      if (err) {
        alert('Google sign-in failed: ' + err)
        return
      }
      await supabaseUpdateUser(username, {
        email: email,
        profile_pic: picture || 'Guest.png'
      })
    }
    localStorage.setItem('loggedInUser', username)
    window.location.href = 'Bilerdia/Home/home.html?user=' + encodeURIComponent(username)
  })
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
