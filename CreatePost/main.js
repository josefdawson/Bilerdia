const loggedInUser = localStorage.getItem('loggedInUser')
if (!loggedInUser) {
  window.location.href = '../index.html'
}

const userData = JSON.parse(localStorage.getItem('user_' + loggedInUser) || '{}')
const profilePic = userData.profilePic || ''

document.getElementById('cancel-btn').addEventListener('click', () => {
  window.location.href = '../Home/home.html'
})

document.getElementById('media-input').addEventListener('change', (e) => {
  const preview = document.getElementById('preview')
  preview.innerHTML = ''
  for (const file of e.target.files) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const el = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('img')
      el.src = ev.target.result
      el.style.maxWidth = '200px'
      el.style.maxHeight = '200px'
      el.style.margin = '5px'
      el.controls = true
      preview.appendChild(el)
    }
    reader.readAsDataURL(file)
  }
})

document.getElementById('submit-btn').addEventListener('click', () => {
  const title = document.getElementById('post-title').value.trim()
  const description = document.getElementById('post-description').value.trim()
  const tagsRaw = document.getElementById('post-tags').value.trim()
  const mediaInput = document.getElementById('media-input')

  if (!title) {
    alert('Please enter a title.')
    return
  }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  const mediaFiles = mediaInput.files
  const mediaPromises = []
  for (const file of mediaFiles) {
    mediaPromises.push(new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = (e) => resolve({ type: file.type.startsWith('video/') ? 'video' : 'image', data: e.target.result })
      reader.readAsDataURL(file)
    }))
  }

  Promise.all(mediaPromises).then((media) => {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]')
    posts.unshift({
      id: Date.now(),
      accountName: loggedInUser,
      profilePic: profilePic,
      title,
      description,
      tags,
      media,
      likes: [],
      dislikes: [],
      createdAt: new Date().toISOString()
    })
    localStorage.setItem('posts', JSON.stringify(posts))

    window.location.href = '../Home/home.html'
  })
})
