const loggedInUser = localStorage.getItem('loggedInUser')
if (!loggedInUser) {
  window.location.href = '../index.html'
}

function getUserData() {
  return JSON.parse(localStorage.getItem('user_' + loggedInUser) || '{}')
}

function saveUserData(data) {
  localStorage.setItem('user_' + loggedInUser, JSON.stringify(data))
}

function getPosts() {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]')
  for (const p of posts) {
    if (!p.likes) p.likes = []
    if (!p.dislikes) p.dislikes = []
    if (p.pinned === undefined) p.pinned = false
    if (p.favorited === undefined) p.favorited = false
  }
  return posts
}

function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts))
}

function getPlaylists() {
  return JSON.parse(localStorage.getItem('playlists_' + loggedInUser) || '{}')
}

function savePlaylists(playlists) {
  localStorage.setItem('playlists_' + loggedInUser, JSON.stringify(playlists))
}

function getComments(postId) {
  const all = JSON.parse(localStorage.getItem('comments_' + postId) || '[]')
  for (const c of all) {
    if (!c.likes) c.likes = []
    if (!c.dislikes) c.dislikes = []
  }
  return all
}

function saveComments(postId, comments) {
  localStorage.setItem('comments_' + postId, JSON.stringify(comments))
}

// Profile picture
const profileImg = document.getElementById('profile-picture')
const userData = getUserData()
if (userData.profilePic) {
  profileImg.src = userData.profilePic
}

// Create button
document.getElementById('create').addEventListener('click', () => {
  window.location.href = '../CreatePost/create.html'
})

// Profile button
document.getElementById('profile-btn').addEventListener('click', openMenu)

// ─── Profile Menu ───────────────────────
const menu = document.getElementById('profile-menu')
const overlay = document.getElementById('menu-overlay')

function openMenu() {
  const data = getUserData()
  document.getElementById('menu-username').textContent = loggedInUser
  document.getElementById('menu-pfp').src = data.profilePic || 'Guest.png'
  buildMenuBody()
  menu.classList.remove('hidden')
  overlay.classList.remove('hidden')
}

function closeMenu() {
  menu.classList.add('hidden')
  overlay.classList.add('hidden')
}

profileImg.addEventListener('click', openMenu)
overlay.addEventListener('click', closeMenu)
document.getElementById('menu-close').addEventListener('click', closeMenu)

function buildMenuBody() {
  const body = document.getElementById('menu-body')
  body.innerHTML = ''

  const data = getUserData()
  if (data.email) {
    addMenuItem('Email: ' + data.email, null)
  }

  addMenuItem('Add Email', () => {
    const email = prompt('Enter your email:')
    if (email) {
      const d = getUserData()
      d.email = email
      saveUserData(d)
      openMenu()
    }
  })

  addMenuItem('Change Profile Picture', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const d = getUserData()
          d.profilePic = e.target.result
          saveUserData(d)
          profileImg.src = e.target.result
          openMenu()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  })

  addMenuItem('Change Username', () => {
    const newName = prompt('Enter new username:')
    if (!newName || !newName.trim()) return
    const name = newName.trim()
    if (localStorage.getItem(name)) {
      alert('Username already taken.')
      return
    }
    const oldPass = localStorage.getItem(loggedInUser)
    localStorage.setItem(name, oldPass)
    localStorage.removeItem(loggedInUser)
    const oldData = getUserData()
    localStorage.removeItem('user_' + loggedInUser)
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    const idx = users.indexOf(loggedInUser)
    if (idx !== -1) { users[idx] = name } else { users.push(name) }
    localStorage.setItem('registeredUsers', JSON.stringify(users))
    const posts = getPosts()
    for (const p of posts) {
      if (p.accountName === loggedInUser) { p.accountName = name }
    }
    savePosts(posts)
    const oldPlaylists = localStorage.getItem('playlists_' + loggedInUser)
    if (oldPlaylists) {
      localStorage.setItem('playlists_' + name, oldPlaylists)
      localStorage.removeItem('playlists_' + loggedInUser)
    }
    localStorage.setItem('user_' + name, JSON.stringify(oldData))
    localStorage.setItem('loggedInUser', name)
    window.location.reload()
  })

  addMenuItem('Change Password', () => {
    const old = prompt('Enter current password:')
    if (localStorage.getItem(loggedInUser) !== old) {
      alert('Incorrect password.')
      return
    }
    const newPw = prompt('Enter new password:')
    if (newPw && newPw.trim()) {
      localStorage.setItem(loggedInUser, newPw.trim())
      alert('Password changed.')
    }
  })

  addMenuItem('History', () => {
    const posts = getPosts().filter(p => p.accountName === loggedInUser)
    if (posts.length === 0) {
      alert('You have no posts yet.')
      return
    }
    closeMenu()
    const card = document.getElementById('card')
    card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back to all posts</button>'
    document.getElementById('back-btn').addEventListener('click', renderPosts)
    for (const post of posts) {
      card.appendChild(createPostElement(post))
    }
  })

  addMenuItem('Members', () => {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    if (users.length === 0) {
      alert('No other members.')
      return
    }
    closeMenu()
    const card = document.getElementById('card')
    card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
    document.getElementById('back-btn').addEventListener('click', renderPosts)
    for (const u of users) {
      const uData = JSON.parse(localStorage.getItem('user_' + u) || '{}')
      const el = document.createElement('div')
      el.className = 'member-card'
      const img = document.createElement('img')
      img.src = uData.profilePic || 'Guest.png'
      img.className = 'member-pfp'
      const name = document.createElement('span')
      name.textContent = u + (u === loggedInUser ? ' (you)' : '')
      name.style.fontWeight = 'bold'
      el.appendChild(img)
      el.appendChild(name)
      if (uData.email) {
        const em = document.createElement('p')
        em.textContent = uData.email
        em.style.margin = '2px 0'
        em.style.fontSize = '13px'
        em.style.color = '#aaa'
        el.appendChild(em)
      }
      card.appendChild(el)
    }
  })

  addMenuItem('Playlists', () => {
    closeMenu()
    const card = document.getElementById('card')
    card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
    document.getElementById('back-btn').addEventListener('click', renderPosts)
    const playlists = getPlaylists()
    const names = Object.keys(playlists)
    if (names.length === 0) {
      card.innerHTML += '<p style="text-align:center;padding:40px;color:#999;">No playlists yet.</p>'
      return
    }
    for (const name of names) {
      const plEl = document.createElement('div')
      plEl.className = 'post'
      const header = document.createElement('div')
      header.className = 'post-header'
      const title = document.createElement('span')
      title.style.fontWeight = 'bold'
      title.style.fontSize = '18px'
      title.textContent = name + ' (' + playlists[name].length + ')'
      header.appendChild(title)
      const delPl = document.createElement('button')
      delPl.className = 'post-delete'
      delPl.textContent = 'Delete Playlist'
      delPl.addEventListener('click', () => {
        if (confirm('Delete playlist "' + name + '"?')) {
          const p = getPlaylists()
          delete p[name]
          savePlaylists(p)
          renderPosts()
        }
      })
      header.appendChild(delPl)
      plEl.appendChild(header)
      const posts = getPosts()
      for (const pid of playlists[name]) {
        const post = posts.find(x => x.id === pid)
        if (post) plEl.appendChild(createPostElement(post))
      }
      card.appendChild(plEl)
    }
  })

  addMenuItem('Log Out', () => {
    localStorage.removeItem('loggedInUser')
    window.location.href = '../index.html'
  })

  addMenuItem('Delete Account', () => {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    if (!confirm('Really delete? All your posts and data will be lost.')) return
    const posts = getPosts().filter(p => p.accountName !== loggedInUser)
    savePosts(posts)
    localStorage.removeItem('user_' + loggedInUser)
    localStorage.removeItem('playlists_' + loggedInUser)
    localStorage.removeItem(loggedInUser)
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    localStorage.setItem('registeredUsers', JSON.stringify(users.filter(u => u !== loggedInUser)))
    localStorage.removeItem('loggedInUser')
    window.location.href = '../index.html'
  })
}

function addMenuItem(text, action) {
  const body = document.getElementById('menu-body')
  const btn = document.createElement('button')
  btn.className = 'menu-btn'
  btn.textContent = text
  if (action) btn.addEventListener('click', action)
  else { btn.disabled = true; btn.style.cursor = 'default'; btn.style.opacity = '0.7' }
  body.appendChild(btn)
}

// ─── Search & Sort ──────────────────────
let currentSort = 'latest'
const searchInput = document.getElementById('search')
const filterBtns = document.querySelectorAll('.filter-btn')

searchInput.addEventListener('input', renderPosts)

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentSort = btn.dataset.sort
    renderPosts()
  })
})

// ─── Post Detail Modal ──────────────────
const detailOverlay = document.getElementById('detail-overlay')
const detailModal = document.getElementById('detail-modal')

function openDetail(postId) {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (!post) return

  detailOverlay.classList.remove('hidden')
  detailModal.classList.remove('hidden')

  const detailTitle = document.getElementById('detail-title')
  detailTitle.textContent = post.title

  // Owner actions (pin / fav)
  const ownerActions = document.getElementById('detail-owner-actions')
  ownerActions.innerHTML = ''
  if (post.accountName === loggedInUser) {
    const pinBtn = document.createElement('button')
    pinBtn.className = 'detail-owner-btn'
    pinBtn.textContent = post.pinned ? '📌 Pinned' : '📌 Pin'
    pinBtn.addEventListener('click', () => {
      const all = getPosts()
      const p = all.find(x => x.id === post.id)
      if (p) { p.pinned = !p.pinned; savePosts(all); openDetail(post.id) }
    })
    ownerActions.appendChild(pinBtn)

    const favBtn = document.createElement('button')
    favBtn.className = 'detail-owner-btn'
    favBtn.textContent = post.favorited ? '⭐ Favorited' : '⭐ Favorite'
    favBtn.addEventListener('click', () => {
      const all = getPosts()
      const p = all.find(x => x.id === post.id)
      if (p) { p.favorited = !p.favorited; savePosts(all); openDetail(post.id) }
    })
    ownerActions.appendChild(favBtn)
  }

  // Content
  const content = document.getElementById('detail-content')
  content.innerHTML = ''

  const meta = document.createElement('div')
  meta.className = 'detail-meta'
  const metaPic = document.createElement('img')
  metaPic.className = 'post-pfp'
  metaPic.src = post.profilePic || 'Guest.png'
  meta.appendChild(metaPic)
  const metaName = document.createElement('span')
  metaName.className = 'post-name'
  metaName.textContent = post.accountName
  meta.appendChild(metaName)
  if (post.pinned) {
    const pinTag = document.createElement('span')
    pinTag.className = 'pin-tag'
    pinTag.textContent = '📌 Pinned'
    meta.appendChild(pinTag)
  }
  if (post.favorited) {
    const favTag = document.createElement('span')
    favTag.className = 'fav-tag'
    favTag.textContent = '⭐ Favorite'
    meta.appendChild(favTag)
  }
  content.appendChild(meta)

  if (post.description) {
    const desc = document.createElement('p')
    desc.className = 'detail-desc'
    desc.textContent = post.description
    content.appendChild(desc)
  }

  if (post.tags && post.tags.length > 0) {
    const tagsDiv = document.createElement('div')
    tagsDiv.className = 'post-tags'
    for (const tag of post.tags) {
      const span = document.createElement('span')
      span.className = 'tag'
      span.textContent = '#' + tag
      tagsDiv.appendChild(span)
    }
    content.appendChild(tagsDiv)
  }

  if (post.media && post.media.length > 0) {
    const mediaDiv = document.createElement('div')
    mediaDiv.className = 'detail-media'
    for (const item of post.media) {
      if (item.type === 'video') {
        const video = document.createElement('video')
        video.src = item.data
        video.controls = true
        mediaDiv.appendChild(video)
      } else {
        const img = document.createElement('img')
        img.src = item.data
        mediaDiv.appendChild(img)
      }
    }
    content.appendChild(mediaDiv)
  }

  // Comments
  renderComments(post.id)
}

function closeDetail() {
  detailOverlay.classList.add('hidden')
  detailModal.classList.add('hidden')
}

document.getElementById('detail-back').addEventListener('click', closeDetail)
detailOverlay.addEventListener('click', closeDetail)

// ─── Comments ───────────────────────────
let currentCommentSort = 'latest'

function renderComments(postId) {
  const list = document.getElementById('comments-list')
  list.innerHTML = ''
  let comments = getComments(postId)

  if (currentCommentSort === 'latest') {
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (currentCommentSort === 'oldest') {
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  } else if (currentCommentSort === 'top') {
    comments.sort((a, b) => (b.likes.length || 0) - (a.likes.length || 0))
  }

  if (comments.length === 0) {
    list.innerHTML = '<p style="color:#999;padding:10px;">No comments yet.</p>'
    return
  }

  for (const c of comments) {
    const el = document.createElement('div')
    el.className = 'comment'

    const header = document.createElement('div')
    header.className = 'comment-header'
    const name = document.createElement('strong')
    name.textContent = c.author
    header.appendChild(name)

    if (c.author === loggedInUser || loggedInUser === document.querySelector('#detail-title')?.textContent === '') {
      // Only the comment author can delete
    }
    if (c.author === loggedInUser) {
      const delC = document.createElement('button')
      delC.className = 'comment-delete'
      delC.textContent = '✕'
      delC.addEventListener('click', () => {
        if (confirm('Delete this comment?')) {
          const all = getComments(postId).filter(x => x.id !== c.id)
          saveComments(postId, all)
          renderComments(postId)
        }
      })
      header.appendChild(delC)
    }

    el.appendChild(header)

    const text = document.createElement('p')
    text.className = 'comment-text'
    text.textContent = c.text
    el.appendChild(text)

    const actions = document.createElement('div')
    actions.className = 'comment-actions'

    const cliked = c.likes.includes(loggedInUser)
    const cdisliked = c.dislikes.includes(loggedInUser)

    const likeBtn = document.createElement('button')
    likeBtn.className = 'caction-btn' + (cliked ? ' active' : '')
    likeBtn.textContent = '👍 ' + c.likes.length
    likeBtn.addEventListener('click', () => {
      const all = getComments(postId)
      const co = all.find(x => x.id === c.id)
      if (!co) return
      if (co.likes.includes(loggedInUser)) {
        co.likes = co.likes.filter(u => u !== loggedInUser)
      } else {
        co.likes.push(loggedInUser)
        co.dislikes = co.dislikes.filter(u => u !== loggedInUser)
      }
      saveComments(postId, all)
      renderComments(postId)
    })
    actions.appendChild(likeBtn)

    const dislikeBtn = document.createElement('button')
    dislikeBtn.className = 'caction-btn' + (cdisliked ? ' active' : '')
    dislikeBtn.textContent = '👎 ' + c.dislikes.length
    dislikeBtn.addEventListener('click', () => {
      const all = getComments(postId)
      const co = all.find(x => x.id === c.id)
      if (!co) return
      if (co.dislikes.includes(loggedInUser)) {
        co.dislikes = co.dislikes.filter(u => u !== loggedInUser)
      } else {
        co.dislikes.push(loggedInUser)
        co.likes = co.likes.filter(u => u !== loggedInUser)
      }
      saveComments(postId, all)
      renderComments(postId)
    })
    actions.appendChild(dislikeBtn)

    el.appendChild(actions)
    list.appendChild(el)
  }
}

// Comment filters
document.querySelectorAll('.cfilter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cfilter-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentCommentSort = btn.dataset.csort
    if (currentDetailPostId) renderComments(currentDetailPostId)
  })
})

// ─── Post rendering ─────────────────────
function renderPosts() {
  const card = document.getElementById('card')
  card.innerHTML = ''
  let posts = getPosts()

  const query = searchInput.value.trim().toLowerCase()
  if (query) {
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      p.accountName.toLowerCase().includes(query) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
    )
  }

  if (currentSort === 'latest') {
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (currentSort === 'oldest') {
    posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  } else if (currentSort === 'top') {
    posts.sort((a, b) => (b.likes.length || 0) - (a.likes.length || 0))
  }

  // Pinned always first
  const pinned = posts.filter(p => p.pinned)
  const rest = posts.filter(p => !p.pinned)
  posts = [...pinned, ...rest]

  if (posts.length === 0) {
    card.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">No posts found.</p>'
    return
  }

  for (const post of posts) {
    card.appendChild(createPostElement(post))
  }
}

function createPostElement(post) {
  const postEl = document.createElement('div')
  postEl.className = 'post'
  postEl.style.cursor = 'pointer'
  postEl.addEventListener('click', (e) => {
    if (e.target.closest('button')) return
    openDetail(post.id)
  })

  const header = document.createElement('div')
  header.className = 'post-header'
  const pic = document.createElement('img')
  pic.className = 'post-pfp'
  pic.src = post.profilePic || 'Guest.png'
  header.appendChild(pic)
  const name = document.createElement('span')
  name.className = 'post-name'
  name.textContent = post.accountName
  if (post.pinned) name.textContent += ' 📌'
  if (post.favorited) name.textContent += ' ⭐'
  header.appendChild(name)

  if (post.accountName === loggedInUser) {
    const delBtn = document.createElement('button')
    delBtn.className = 'post-delete'
    delBtn.textContent = 'Delete'
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (confirm('Delete this post?')) {
        const all = getPosts().filter(p => p.id !== post.id)
        savePosts(all)
        renderPosts()
      }
    })
    header.appendChild(delBtn)
  }

  postEl.appendChild(header)

  const title = document.createElement('h2')
  title.className = 'post-title'
  title.textContent = post.title
  postEl.appendChild(title)

  if (post.description) {
    const desc = document.createElement('p')
    desc.className = 'post-desc'
    desc.textContent = post.description
    postEl.appendChild(desc)
  }

  if (post.tags && post.tags.length > 0) {
    const tagsDiv = document.createElement('div')
    tagsDiv.className = 'post-tags'
    for (const tag of post.tags) {
      const span = document.createElement('span')
      span.className = 'tag'
      span.textContent = '#' + tag
      tagsDiv.appendChild(span)
    }
    postEl.appendChild(tagsDiv)
  }

  if (post.media && post.media.length > 0) {
    const mediaDiv = document.createElement('div')
    mediaDiv.className = 'post-media'
    for (const item of post.media) {
      if (item.type === 'video') {
        const video = document.createElement('video')
        video.src = item.data
        video.controls = true
        mediaDiv.appendChild(video)
      } else {
        const img = document.createElement('img')
        img.src = item.data
        mediaDiv.appendChild(img)
      }
    }
    postEl.appendChild(mediaDiv)
  }

  const actions = document.createElement('div')
  actions.className = 'post-actions'

  const liked = post.likes.includes(loggedInUser)
  const disliked = post.dislikes.includes(loggedInUser)

  const likeBtn = document.createElement('button')
  likeBtn.className = 'action-btn' + (liked ? ' active' : '')
  likeBtn.textContent = '👍 ' + post.likes.length
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const all = getPosts()
    const p = all.find(x => x.id === post.id)
    if (!p) return
    if (p.likes.includes(loggedInUser)) {
      p.likes = p.likes.filter(u => u !== loggedInUser)
    } else {
      p.likes.push(loggedInUser)
      p.dislikes = p.dislikes.filter(u => u !== loggedInUser)
    }
    savePosts(all)
    renderPosts()
  })
  actions.appendChild(likeBtn)

  const dislikeBtn = document.createElement('button')
  dislikeBtn.className = 'action-btn' + (disliked ? ' active' : '')
  dislikeBtn.textContent = '👎 ' + post.dislikes.length
  dislikeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const all = getPosts()
    const p = all.find(x => x.id === post.id)
    if (!p) return
    if (p.dislikes.includes(loggedInUser)) {
      p.dislikes = p.dislikes.filter(u => u !== loggedInUser)
    } else {
      p.dislikes.push(loggedInUser)
      p.likes = p.likes.filter(u => u !== loggedInUser)
    }
    savePosts(all)
    renderPosts()
  })
  actions.appendChild(dislikeBtn)

  const shareBtn = document.createElement('button')
  shareBtn.className = 'action-btn'
  shareBtn.textContent = '🔗 Share'
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const text = post.title + ' — ' + post.accountName + ' (Bilerdia)'
    navigator.clipboard.writeText(text).then(() => {
      shareBtn.textContent = '✓ Copied!'
      setTimeout(() => { shareBtn.textContent = '🔗 Share' }, 2000)
    })
  })
  actions.appendChild(shareBtn)

  const playlistBtn = document.createElement('button')
  playlistBtn.className = 'action-btn'
  playlistBtn.textContent = '➕ Playlist'
  playlistBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const playlists = getPlaylists()
    const names = Object.keys(playlists)
    let msg = 'Add to which playlist?\n'
    if (names.length === 0) {
      msg += '(No playlists yet. Enter a new name below.)'
    } else {
      for (let i = 0; i < names.length; i++) {
        msg += (i + 1) + '. ' + names[i] + '\n'
      }
      msg += '\nOr enter a new playlist name:'
    }
    const choice = prompt(msg)
    if (!choice || !choice.trim()) return
    const name = choice.trim()
    const pl = getPlaylists()
    if (!pl[name]) pl[name] = []
    if (!pl[name].includes(post.id)) {
      pl[name].push(post.id)
      savePlaylists(pl)
      playlistBtn.textContent = '✓ Added!'
      setTimeout(() => { playlistBtn.textContent = '➕ Playlist' }, 2000)
    } else {
      alert('Already in that playlist.')
    }
  })
  actions.appendChild(playlistBtn)

  postEl.appendChild(actions)
  return postEl
}

// ─── Fix comment submission ────────────
// We need to track which post is open. Let's store the current post id.
let currentDetailPostId = null

// Override openDetail to store the id
const _origOpenDetail = openDetail
openDetail = function(postId) {
  currentDetailPostId = postId
  document.getElementById('detail-content').dataset.postId = postId
  _origOpenDetail(postId)
}

document.getElementById('comment-submit').addEventListener('click', () => {
  const input = document.getElementById('comment-input')
  const text = input.value.trim()
  if (!text || !currentDetailPostId) return
  input.value = ''

  const comments = getComments(currentDetailPostId)
  comments.push({
    id: Date.now(),
    postId: currentDetailPostId,
    author: loggedInUser,
    text,
    likes: [],
    dislikes: [],
    createdAt: new Date().toISOString()
  })
  saveComments(currentDetailPostId, comments)
  renderComments(currentDetailPostId)
})

// Support Enter to submit comment
document.getElementById('comment-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    document.getElementById('comment-submit').click()
  }
})

renderPosts()
