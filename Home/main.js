if (!loggedInUser) {
  window.location.href = '../index.html'
}

function getUserData() {
  return JSON.parse(localStorage.getItem('user_' + loggedInUser) || '{}')
}

function saveUserData(data) {
  localStorage.setItem('user_' + loggedInUser, JSON.stringify(data))
  syncWriteUser(loggedInUser, data)
}

function getPosts() {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]')
  for (const p of posts) {
    if (!p.likes) p.likes = []
    if (!p.dislikes) p.dislikes = []
    if (p.pinned === undefined) p.pinned = false
    if (p.favorited === undefined) p.favorited = false
    if (p.genre === undefined) p.genre = ''
  }
  return posts
}

async function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts))
  await syncWritePosts(posts)
}

function getPlaylists() {
  return JSON.parse(localStorage.getItem('playlists_' + loggedInUser) || '{}')
}

function savePlaylists(playlists) {
  localStorage.setItem('playlists_' + loggedInUser, JSON.stringify(playlists))
  syncWritePlaylists(loggedInUser, playlists)
}

function getComments(postId) {
  const all = JSON.parse(localStorage.getItem('comments_' + postId) || '[]')
  for (const c of all) {
    if (!c.likes) c.likes = []
    if (!c.dislikes) c.dislikes = []
  }
  return all
}

async function saveComments(postId, comments) {
  localStorage.setItem('comments_' + postId, JSON.stringify(comments))
  await syncWriteComments(postId, comments)
}

// ─── Friend helpers ─────────────────────
function getFriends(user) {
  return JSON.parse(localStorage.getItem('friends_' + user) || '[]')
}
function saveFriends(user, list) {
  localStorage.setItem('friends_' + user, JSON.stringify(list))
  syncWriteFriends(user, list)
}
function getFriendRequests(user) {
  return JSON.parse(localStorage.getItem('fr_requests_' + user) || '[]')
}
function saveFriendRequests(user, list) {
  localStorage.setItem('fr_requests_' + user, JSON.stringify(list))
  syncWriteFriendRequests(user, list)
}
function getSentRequests(user) {
  return JSON.parse(localStorage.getItem('fr_sent_' + user) || '[]')
}
function saveSentRequests(user, list) {
  localStorage.setItem('fr_sent_' + user, JSON.stringify(list))
  syncWriteSentRequests(user, list)
}

// ─── Time helper ────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 30) return days + 'd ago'
  const months = Math.floor(days / 30)
  if (months < 12) return months + 'mo ago'
  return Math.floor(months / 12) + 'y ago'
}

// Create button
document.getElementById('create').addEventListener('click', () => {
  window.location.href = '../CreatePost/create.html?user=' + encodeURIComponent(loggedInUser)
})

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

// ─── Sidebar ─────────────────────────────
let currentPage = 'posts'
const sidebarPfp = document.getElementById('sidebar-pfp')
const sidebarUsername = document.getElementById('sidebar-username')
sidebarPfp.addEventListener('click', openMenu)

function goToPosts() {
  currentPage = 'posts'
  renderPosts()
}

document.querySelectorAll('.sidebar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page
    if (page === currentPage) { goToPosts(); return }
    currentPage = page
    switch (page) {
      case 'playlists': showPlaylists(); break
      case 'members': showMembers(); break
      case 'history': showHistory(); break
      case 'liked': showLikedPosts(); break
      case 'friends': showFriends(); break
      case 'settings': showSettings(); break
    }
  })
})

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light')
  localStorage.setItem('theme', theme)
}

function showSettings() {
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
  document.getElementById('back-btn').addEventListener('click', goToPosts)
  const currentTheme = localStorage.getItem('theme') || 'dark'
  const notifEnabled = localStorage.getItem('notificationsEnabled') === 'true'
  card.innerHTML += `
    <div style="padding:20px;">
      <h2 style="color:#ddd;margin-bottom:24px;">Settings</h2>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <label style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgb(70,70,70);border-radius:8px;cursor:pointer;">
          <span style="color:#ddd;">Light Mode</span>
          <input type="checkbox" id="theme-toggle" ${currentTheme === 'light' ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgb(70,70,70);border-radius:8px;cursor:pointer;">
          <span style="color:#ddd;">Notifications</span>
          <input type="checkbox" id="notif-toggle" ${notifEnabled ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
        </label>
      </div>
    </div>`
  document.getElementById('theme-toggle').addEventListener('change', function() {
    applyTheme(this.checked ? 'light' : 'dark')
  })
  document.getElementById('notif-toggle').addEventListener('change', function() {
    localStorage.setItem('notificationsEnabled', this.checked)
    if (this.checked) Notification.requestPermission()
  })
}

function showPlaylists() {
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
  document.getElementById('back-btn').addEventListener('click', goToPosts)
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
}

function showMembers() {
  const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
  if (users.length === 0) {
    alert('No other members found. Try syncing from Supabase first.')
    return
  }
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
  document.getElementById('back-btn').addEventListener('click', goToPosts)
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
    if (u !== loggedInUser) {
      const friends = getFriends(loggedInUser)
      const requests = getFriendRequests(loggedInUser)
      const sent = getSentRequests(loggedInUser)
      const btnRow = document.createElement('div')
      btnRow.style.cssText = 'display:flex;gap:6px;margin-left:auto;'
      if (friends.includes(u)) {
        const fLabel = document.createElement('span')
        fLabel.textContent = 'Friends ✓'
        fLabel.style.cssText = 'color:rgb(0,200,100);font-size:12px;font-weight:bold;padding:4px 0;'
        btnRow.appendChild(fLabel)
      } else if (requests.includes(u)) {
        const accept = document.createElement('button')
        accept.textContent = 'Accept'
        accept.style.cssText = 'background:rgb(0,140,60);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;'
        accept.addEventListener('click', async () => {
          const myFriends = getFriends(loggedInUser)
          myFriends.push(u)
          saveFriends(loggedInUser, myFriends)
          const theirFriends = getFriends(u)
          theirFriends.push(loggedInUser)
          saveFriends(u, theirFriends)
          const reqs = getFriendRequests(loggedInUser).filter(x => x !== u)
          saveFriendRequests(loggedInUser, reqs)
          const s = getSentRequests(u).filter(x => x !== loggedInUser)
          saveSentRequests(u, s)
          await syncAddFriendAsAccepted(loggedInUser, u)
          closeMenu()
        })
        btnRow.appendChild(accept)
        const decline = document.createElement('button')
        decline.textContent = 'Decline'
        decline.style.cssText = 'background:rgb(180,50,50);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;'
        decline.addEventListener('click', async () => {
          const reqs = getFriendRequests(loggedInUser).filter(x => x !== u)
          saveFriendRequests(loggedInUser, reqs)
          const s = getSentRequests(u).filter(x => x !== loggedInUser)
          saveSentRequests(u, s)
          await syncDeleteFriendRequest(u, loggedInUser)
          closeMenu()
        })
        btnRow.appendChild(decline)
      } else if (sent.includes(u)) {
        const pend = document.createElement('span')
        pend.textContent = 'Pending'
        pend.style.cssText = 'color:#aaa;font-size:12px;padding:4px 0;'
        btnRow.appendChild(pend)
      } else {
        const addBtn = document.createElement('button')
        addBtn.textContent = 'Add Friend'
        addBtn.style.cssText = 'background:rgb(0,140,60);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;'
        addBtn.addEventListener('click', async () => {
          const theirReqs = getFriendRequests(u)
          theirReqs.push(loggedInUser)
          saveFriendRequests(u, theirReqs)
          const mySent = getSentRequests(loggedInUser)
          mySent.push(u)
          saveSentRequests(loggedInUser, mySent)
          await syncSendFriendRequest(loggedInUser, u)
          closeMenu()
        })
        btnRow.appendChild(addBtn)
      }
      el.appendChild(btnRow)
    }
    card.appendChild(el)
  }
}

function showLikedPosts() {
  const posts = getPosts().filter(p => p.likes.includes(loggedInUser))
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back to all posts</button>'
  document.getElementById('back-btn').addEventListener('click', goToPosts)
  if (posts.length === 0) {
    card.innerHTML += '<p style="text-align:center;padding:40px;color:#999;">You haven\'t liked any posts yet.</p>'
    return
  }
  for (const post of posts) {
    card.appendChild(createPostElement(post))
  }
}

function showHistory() {
  const posts = getPosts().filter(p => p.accountName === loggedInUser)
  if (posts.length === 0) {
    alert('You have no posts yet.')
    return
  }
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back to all posts</button>'
  document.getElementById('back-btn').addEventListener('click', goToPosts)
  for (const post of posts) {
    card.appendChild(createPostElement(post))
  }
}

function showFriends() {
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
  document.getElementById('back-btn').addEventListener('click', goToPosts)
  const friends = getFriends(loggedInUser)
  if (friends.length === 0) {
    card.innerHTML += '<p style="text-align:center;padding:40px;color:#999;">No friends yet. Add some from the Members list!</p>'
    return
  }
  function renderFriendList() {
    card.querySelectorAll('.friend-dynamic').forEach(el => el.remove())
    const requests = getFriendRequests(loggedInUser)
    if (requests.length > 0) {
      const h3 = document.createElement('h3')
      h3.className = 'friend-dynamic'
      h3.style.cssText = 'padding:0 16px;color:#ffa;'
      h3.textContent = 'Pending requests (' + requests.length + ')'
      card.appendChild(h3)
      for (const r of requests) {
        const rData = JSON.parse(localStorage.getItem('user_' + r) || '{}')
        const el = document.createElement('div')
        el.className = 'member-card friend-dynamic'
        const img = document.createElement('img')
        img.src = rData.profilePic || 'Guest.png'
        img.className = 'member-pfp'
        el.appendChild(img)
        const name = document.createElement('span')
        name.textContent = r
        name.style.fontWeight = 'bold'
        el.appendChild(name)
        const accept = document.createElement('button')
        accept.textContent = 'Accept'
        accept.style.cssText = 'background:rgb(0,140,60);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;'
        accept.addEventListener('click', async () => {
          const myFriends = getFriends(loggedInUser)
          myFriends.push(r)
          saveFriends(loggedInUser, myFriends)
          const theirFriends = getFriends(r)
          theirFriends.push(loggedInUser)
          saveFriends(r, theirFriends)
          const reqs = getFriendRequests(loggedInUser).filter(x => x !== r)
          saveFriendRequests(loggedInUser, reqs)
          const sent = getSentRequests(r).filter(x => x !== loggedInUser)
          saveSentRequests(r, sent)
          await syncAddFriendAsAccepted(loggedInUser, r)
          renderFriendList()
        })
        el.appendChild(accept)
        const decline = document.createElement('button')
        decline.textContent = 'Decline'
        decline.style.cssText = 'background:rgb(180,50,50);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;'
        decline.addEventListener('click', async () => {
          const reqs = getFriendRequests(loggedInUser).filter(x => x !== r)
          saveFriendRequests(loggedInUser, reqs)
          const sent = getSentRequests(r).filter(x => x !== loggedInUser)
          saveSentRequests(r, sent)
          await syncDeleteFriendRequest(r, loggedInUser)
          renderFriendList()
        })
        el.appendChild(decline)
        card.appendChild(el)
      }
    }
    const h3 = document.createElement('h3')
    h3.className = 'friend-dynamic'
    h3.style.cssText = 'padding:0 16px;color:white;'
    h3.textContent = 'Your Friends (' + friends.length + ')'
    card.appendChild(h3)
    for (const f of friends) {
      const fData = JSON.parse(localStorage.getItem('user_' + f) || '{}')
      const el = document.createElement('div')
      el.className = 'member-card friend-dynamic'
      const img = document.createElement('img')
      img.src = fData.profilePic || 'Guest.png'
      img.className = 'member-pfp'
      el.appendChild(img)
      const name = document.createElement('span')
      name.textContent = f
      name.style.fontWeight = 'bold'
      el.appendChild(name)
      card.appendChild(el)
    }
  }
  renderFriendList()
}

overlay.addEventListener('click', closeMenu)
document.getElementById('menu-close').addEventListener('click', closeMenu)

function sendNotif(title, body) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
    new Notification(title, { body })
}

;(async function() {
  applyTheme(localStorage.getItem('theme') || 'dark')
  await initSync()
  await syncRefreshFriends(loggedInUser)
  // Check for pending friend requests
  const pendingReqs = getFriendRequests(loggedInUser)
  for (const r of pendingReqs) {
    if (confirm('Accept friend request from ' + r + '?')) {
      const myFriends = getFriends(loggedInUser)
      myFriends.push(r)
      saveFriends(loggedInUser, myFriends)
      const theirFriends = getFriends(r)
      theirFriends.push(loggedInUser)
      saveFriends(r, theirFriends)
      const reqs = getFriendRequests(loggedInUser).filter(x => x !== r)
      saveFriendRequests(loggedInUser, reqs)
      const sent = getSentRequests(r).filter(x => x !== loggedInUser)
      saveSentRequests(r, sent)
      await syncAddFriendAsAccepted(loggedInUser, r)
    } else {
      const reqs = getFriendRequests(loggedInUser).filter(x => x !== r)
      saveFriendRequests(loggedInUser, reqs)
      const sent = getSentRequests(r).filter(x => x !== loggedInUser)
      saveSentRequests(r, sent)
      await syncDeleteFriendRequest(r, loggedInUser)
    }
  }
  const data = getUserData()
  if (data.profilePic) sidebarPfp.src = data.profilePic
  sidebarUsername.textContent = loggedInUser
  renderPosts()

  // One-time notification prompt
  if (!localStorage.getItem('notificationsPrompted')) {
    localStorage.setItem('notificationsPrompted', 'true')
    if (confirm('Would you like to turn on notifications?')) {
      const perm = typeof Notification !== 'undefined' ? await Notification.requestPermission() : 'denied'
      localStorage.setItem('notificationsEnabled', perm === 'granted')
    }
  }

  let knownPostIds = new Set(getPosts().map(p => p.id))
  let knownUserCount = (JSON.parse(localStorage.getItem('registeredUsers') || '[]')).length

  setInterval(async () => {
    await refreshPostsFromSupabase()
    await syncRefreshFriends(loggedInUser)
    if (currentPage === 'posts') renderPosts()
    if (currentDetailPostId) renderComments(currentDetailPostId)

    if (localStorage.getItem('notificationsEnabled') === 'true') {
      const posts = getPosts()
      const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
      for (const p of posts) {
        if (!knownPostIds.has(p.id) && p.accountName !== loggedInUser)
          sendNotif('New post by ' + p.accountName, p.title || '(no title)')
      }
      if (users.length > knownUserCount) {
        const newUsers = users.slice(knownUserCount)
        sendNotif('New member' + (newUsers.length > 1 ? 's' : '') + ' joined Bilerdia!', newUsers.join(', '))
      }
      knownPostIds = new Set(posts.map(p => p.id))
      knownUserCount = users.length
    }
  }, 10000)
})()

// ─── Developer Console (F8 or ~) ─────────
let devConsole = null
let _forceDeleteMode = false

async function wipeUser(user) {
  const allPosts = await supabaseGetPosts()
  for (const p of allPosts) {
    if ((p.likes||[]).includes(user) || (p.dislikes||[]).includes(user))
      await supabaseUpdatePost(p.id, { likes: (p.likes||[]).filter(u=>u!==user), dislikes: (p.dislikes||[]).filter(u=>u!==user) })
    if (p.author === user) { markPostDeleted(p.id); await supabaseDeletePost(p.id) }
  }
  for (const p of allPosts) {
    const comments = await supabaseGetComments(p.id)
    for (const c of comments) if (c.author === user) await supabaseDeleteComment(c.id)
  }
  for (const f of await supabaseGetFriends(user)) await supabaseDeleteFriendRelationship(user, f)
  for (const r of await supabaseGetFriendRequests(user)) await supabaseDeleteFriendRelationship(r, user)
  for (const s of await supabaseGetSentRequests(user)) await supabaseDeleteFriendRelationship(user, s)
  for (const c of await supabaseGetUserConversations(user)) {
    if (c.type === 'dm' || c.members.length <= 2) await _sup('DELETE', 'conversations', { eq: { id: c.id } })
    else { c.members = c.members.filter(m => m !== user); if (c.members.length > 0) await supabaseSaveConversation(c); else await _sup('DELETE', 'conversations', { eq: { id: c.id } }) }
  }
  for (const pl of await supabaseGetPlaylists(user)) await supabaseDeletePlaylist(pl.id)
  await supabaseDeleteUser(user)
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'F8' && e.key !== '`') return
  e.preventDefault()
  if (devConsole) { devConsole.remove(); devConsole = null; return }
  devConsole = document.createElement('div')
  devConsole.id = 'dev-console'
  devConsole.innerHTML = '<div id="dev-header">Developer Console <button id="dev-close">&times;</button></div><div id="dev-body"></div>'
  document.body.appendChild(devConsole)
  document.getElementById('dev-close').onclick = () => { devConsole.remove(); devConsole = null }
  const body = document.getElementById('dev-body')
  const addBtn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; body.appendChild(b) }
  addBtn('Delete Other User', async () => {
    const users = await supabaseGetAllUsers()
    const target = prompt('Enter username to delete:\n\nUsers:\n' + users.join('\n'))
    if (!target || target === loggedInUser) return
    if (!await supabaseUserExists(target)) { alert('User not found.'); return }
    if (!confirm('Delete "' + target + '" entirely? Posts, comments, chats — all gone.')) return
    if (!confirm('Final warning! This cannot be undone.')) return
    await wipeUser(target)
    alert('User "' + target + '" has been wiped.')
  })
  addBtn('List All Users', async () => {
    const users = await supabaseGetAllUsers()
    alert('Users:\n' + users.join('\n'))
  })
  addBtn('Clear Local Data', () => {
    if (confirm('Clear all local data and reload?')) { localStorage.clear(); location.reload() }
  })
  addBtn('Force Sync Now', async () => {
    await initSync()
    await syncRefreshConversations()
    renderPosts()
    alert('Sync complete!')
  })
  const forceDelBtn = document.createElement('button')
  forceDelBtn.textContent = '🔓 Force Delete: OFF'
  forceDelBtn.onclick = () => {
    _forceDeleteMode = !_forceDeleteMode
    forceDelBtn.textContent = _forceDeleteMode ? '🔒 Force Delete: ON' : '🔓 Force Delete: OFF'
    renderPosts()
  }
  body.appendChild(forceDelBtn)
  addBtn('Manage Other User Posts', async () => {
    const users = await supabaseGetAllUsers()
    const target = prompt('Enter username to manage posts:\n\nUsers:\n' + users.join('\n'))
    if (!target || target === loggedInUser) return
    const allPosts = JSON.parse(localStorage.getItem('posts') || '[]').filter(p => p.accountName === target)
    const supaPosts = await supabaseGetPosts()
    for (const sp of supaPosts) { if (sp.author === target && !allPosts.find(p => p.id === sp.id)) allPosts.push(postFromSupabase(sp)) }
    if (allPosts.length === 0) { alert('No posts found for "' + target + '".'); return }
    const msg = allPosts.map((p, i) => (i + 1) + '. [ID:' + p.id + '] ' + (p.title || '(no title)')).join('\n')
    const choice = prompt('Enter the NUMBER of the post to delete (or "all" to delete all):\n\n' + msg)
    if (!choice) return
    if (choice.toLowerCase() === 'all') {
      if (!confirm('Delete ALL posts by "' + target + '" (' + allPosts.length + ' posts)?')) return
      for (const p of allPosts) {
        markPostDeleted(p.id)
        await supabaseDeletePost(p.id)
        const comments = JSON.parse(localStorage.getItem('comments_' + p.id) || '[]')
        for (const c of comments) await supabaseDeleteComment(c.id)
        localStorage.removeItem('comments_' + p.id)
      }
      const remaining = JSON.parse(localStorage.getItem('posts') || '[]').filter(p => p.accountName !== target)
      localStorage.setItem('posts', JSON.stringify(remaining))
      alert('Deleted ' + allPosts.length + ' posts by "' + target + '".')
    } else {
      const idx = parseInt(choice, 10) - 1
      if (isNaN(idx) || idx < 0 || idx >= allPosts.length) { alert('Invalid number.'); return }
      const p = allPosts[idx]
      if (!confirm('Delete post "' + p.title + '" by "' + target + '"?')) return
      markPostDeleted(p.id)
      await supabaseDeletePost(p.id)
      const comments = JSON.parse(localStorage.getItem('comments_' + p.id) || '[]')
      for (const c of comments) await supabaseDeleteComment(c.id)
      localStorage.removeItem('comments_' + p.id)
      const remaining = JSON.parse(localStorage.getItem('posts') || '[]').filter(pp => pp.id !== p.id)
      localStorage.setItem('posts', JSON.stringify(remaining))
      alert('Deleted post "' + p.title + '".')
    }
    renderPosts()
  })
})

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
          sidebarPfp.src = e.target.result
          openMenu()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  })

  addMenuItem('Change Username', async () => {
    const newName = prompt('Enter new username:')
    if (!newName || !newName.trim()) return
    const name = newName.trim()
    const exists = await supabaseUserExists(name)
    if (exists) { alert('Username already taken.'); return }
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
    // Migrate friend data
    const oldFriends = getFriends(loggedInUser)
    saveFriends(name, oldFriends)
    localStorage.removeItem('friends_' + loggedInUser)
    const oldReqs = getFriendRequests(loggedInUser)
    saveFriendRequests(name, oldReqs)
    localStorage.removeItem('fr_requests_' + loggedInUser)
    const oldSent = getSentRequests(loggedInUser)
    saveSentRequests(name, oldSent)
    localStorage.removeItem('fr_sent_' + loggedInUser)
    for (const f of oldFriends) {
      const fList = getFriends(f)
      const idx = fList.indexOf(loggedInUser)
      if (idx !== -1) { fList[idx] = name; saveFriends(f, fList) }
    }
    for (const r of oldReqs) {
      const sList = getSentRequests(r)
      const idx = sList.indexOf(loggedInUser)
      if (idx !== -1) { sList[idx] = name; saveSentRequests(r, sList) }
    }
    for (const s of oldSent) {
      const rList = getFriendRequests(s)
      const idx = rList.indexOf(loggedInUser)
      if (idx !== -1) { rList[idx] = name; saveFriendRequests(s, rList) }
    }
    localStorage.setItem('user_' + name, JSON.stringify(oldData))
    localStorage.setItem('loggedInUser', name)
    // Sync username change to Supabase
    ;(async () => {
      await _sup('POST', 'users', { body: { username: name, password: oldPass } })
      await supabaseDeleteUser(loggedInUser)
      const allPosts = await supabaseGetPosts()
      for (const p of allPosts) {
        if (p.author === loggedInUser) await supabaseUpdatePost(p.id, { author: name, author_pic: (JSON.parse(localStorage.getItem('user_' + name) || '{}')).profilePic || 'Guest.png' })
      }
      for (const p of allPosts) {
        const comments = await supabaseGetComments(p.id)
        for (const c of comments) if (c.author === loggedInUser) await supabaseUpdateComment(c.id, { author: name })
      }
    })()
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

  addMenuItem('Log Out', () => {
    localStorage.removeItem('loggedInUser')
    window.location.href = '../index.html'
  })

  addMenuItem('Delete Account', async () => {
    if (!confirm('Wipe your account forever? This removes EVERYTHING.')) return
    if (!confirm('Really? All posts, likes, comments, chats, friends — gone.')) return
    await wipeUser(loggedInUser)
    localStorage.clear()
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

  if (post.genre) {
    const genreEl = document.createElement('span')
    genreEl.className = 'genre-badge'
    genreEl.textContent = post.genre
    content.appendChild(genreEl)
  }

  renderPoll(post, content)

  if ((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0)) {
    const mediaDiv = document.createElement('div')
    mediaDiv.className = 'detail-media'
    for (const url of (post.videos || [])) {
      const video = document.createElement('video')
      video.src = url
      video.controls = true
      mediaDiv.appendChild(video)
    }
    for (const url of (post.images || [])) {
      if (url && url.startsWith('data:')) {
        const wrapper = document.createElement('div')
        wrapper.className = 'media-wrapper'
        const loader = document.createElement('div')
        loader.className = 'media-loading'
        wrapper.appendChild(loader)
        const img = document.createElement('img')
        img.style.display = 'none'
        img.onload = () => { try { wrapper.removeChild(loader) } catch(e) {}; img.style.display = '' }
        img.onerror = () => { try { wrapper.removeChild(loader) } catch(e) {}; loader.className = 'media-error'; loader.textContent = 'Image failed to load' }
        img.src = url
        wrapper.appendChild(img)
        mediaDiv.appendChild(wrapper)
      }
    }
    if (mediaDiv.children.length === 0) { mediaDiv.textContent = '(media data unavailable)' }
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

async function renderComments(postId) {
  const list = document.getElementById('comments-list')
  list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#888;"><div style="font-size:36px;margin-bottom:12px;">🚧</div><p style="color:#777;">Comments are under construction.</p></div>'
  return
  list.innerHTML = ''
  try {
    const supaComments = await supabaseGetComments(postId)
    if (supaComments) localStorage.setItem('comments_' + postId, JSON.stringify(supaComments.map(c => commentFromSupabase(c))))
  } catch(e) { console.error('renderComments fetch', e) }
  let comments = getComments(postId)
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  const postAuthor = post ? post.accountName : ''

  // Separate pinned comment
  const pinned = comments.find(c => c.pinned)
  const rest = comments.filter(c => !c.pinned)

  // Sort non-pinned comments
  if (currentCommentSort === 'latest') {
    rest.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (currentCommentSort === 'oldest') {
    rest.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  } else if (currentCommentSort === 'top') {
    rest.sort((a, b) => (b.likes.length || 0) - (a.likes.length || 0))
  }

  // Sort pinned to top no matter what
  const sorted = pinned ? [pinned, ...rest] : rest

  if (sorted.length === 0) {
    list.innerHTML = '<p style="color:#999;padding:10px;">No comments yet.</p>'
    return
  }

  // Top-level comments only (no parentId); replies are rendered inside their parent
  const topLevel = sorted.filter(c => !c.parentId)

  for (const c of topLevel) {
    list.appendChild(createCommentElement(c, postId, postAuthor))
    // Render replies
    const replies = sorted.filter(r => r.parentId === c.id)
    for (const r of replies) {
      const replyEl = createCommentElement(r, postId, postAuthor)
      replyEl.style.marginLeft = '30px'
      replyEl.style.borderLeft = '2px solid #555'
      replyEl.style.paddingLeft = '10px'
      replyEl.style.marginTop = '4px'
      list.appendChild(replyEl)
    }
  }
}

function createCommentElement(c, postId, postAuthor) {
  const el = document.createElement('div')
  el.className = 'comment'

  // Favorite star badge (top-right corner)
  if (c.favorited) {
    const star = document.createElement('span')
    star.textContent = '⭐'
    star.style.cssText = 'position:absolute;top:4px;right:8px;font-size:14px;cursor:default'
    el.style.position = 'relative'
    el.appendChild(star)
  }

  const header = document.createElement('div')
  header.className = 'comment-header'
  const name = document.createElement('strong')
  name.textContent = c.author
  header.appendChild(name)

  // Pinned badge
  if (c.pinned) {
    const pinBadge = document.createElement('span')
    pinBadge.textContent = '📌 Pinned by ' + c.pinnedBy
    pinBadge.style.cssText = 'color:#ffa;font-size:11px;margin-left:8px'
    header.appendChild(pinBadge)
  }

  if (c.author === loggedInUser) {
    const delC = document.createElement('button')
    delC.className = 'comment-delete'
    delC.textContent = '✕'
    delC.addEventListener('click', async () => {
      if (confirm('Delete this comment?')) {
        await supabaseDeleteComment(c.id)
        const all = getComments(postId).filter(x => x.id !== c.id && x.parentId !== c.id)
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

  // ─── Reply button (visible to everyone) ───
  const replyBtn = document.createElement('button')
  replyBtn.className = 'caction-btn'
  replyBtn.textContent = '💬 Reply'
  replyBtn.addEventListener('click', () => {
    // Insert reply input after this comment if not already present
    const existing = el.querySelector('.reply-input-row')
    if (existing) { existing.remove(); return }
    const row = document.createElement('div')
    row.className = 'reply-input-row'
    row.style.cssText = 'display:flex;gap:6px;margin-top:6px'
    const inp = document.createElement('input')
    inp.type = 'text'
    inp.placeholder = 'Write a reply...'
    inp.style.cssText = 'flex:1;padding:6px;border-radius:4px;border:1px solid #555;background:rgb(40,40,40);color:rgb(220,220,220);outline:none'
    row.appendChild(inp)
    const send = document.createElement('button')
    send.textContent = 'Reply'
    send.style.cssText = 'padding:4px 10px;background:rgb(0,120,200);color:white;border:none;border-radius:4px;cursor:pointer'
    send.addEventListener('click', () => {
      const txt = inp.value.trim()
      if (!txt) return
      const all = getComments(postId)
      all.push({
        id: Date.now() + Math.random(),
        postId,
        author: loggedInUser,
        text: txt,
        likes: [],
        dislikes: [],
        pinned: false,
        pinnedBy: '',
        favorited: false,
        parentId: c.id,
        createdAt: new Date().toISOString()
      })
      saveComments(postId, all)
      renderComments(postId)
    })
    row.appendChild(send)
    el.appendChild(row)
    inp.focus()
  })
  actions.appendChild(replyBtn)

  // ─── Pin / Favorite buttons (post creator only) ───
  if (loggedInUser === postAuthor) {
    const pinBtn = document.createElement('button')
    pinBtn.className = 'caction-btn'
    pinBtn.textContent = c.pinned ? '📌' : '📌'
    pinBtn.addEventListener('click', () => {
      const all = getComments(postId)
      const co = all.find(x => x.id === c.id)
      if (!co) return
      // Unpin any previously pinned comment
      if (!co.pinned) {
        for (const x of all) if (x.pinned) { x.pinned = false; x.pinnedBy = '' }
      }
      co.pinned = !co.pinned
      co.pinnedBy = co.pinned ? loggedInUser : ''
      saveComments(postId, all)
      renderComments(postId)
    })
    actions.appendChild(pinBtn)

    const favBtn = document.createElement('button')
    favBtn.className = 'caction-btn'
    favBtn.textContent = c.favorited ? '⭐' : '⭐'
    favBtn.style.opacity = c.favorited ? '1' : '0.5'
    favBtn.addEventListener('click', () => {
      const all = getComments(postId)
      const co = all.find(x => x.id === c.id)
      if (!co) return
      co.favorited = !co.favorited
      saveComments(postId, all)
      renderComments(postId)
    })
    actions.appendChild(favBtn)
  }

  el.appendChild(actions)
  return el
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

function renderPoll(post, container) {
  if (!post.poll) return
  const pollDiv = document.createElement('div')
  pollDiv.className = 'poll-container'
  const totalVotes = Object.values(post.poll.votes).reduce((s, v) => s + v.length, 0)
  for (const opt of post.poll.options) {
    const voters = post.poll.votes[opt] || []
    const count = voters.length
    const pct = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0
    const voted = voters.includes(loggedInUser)
    const row = document.createElement('div')
    row.className = 'poll-row' + (voted ? ' poll-voted' : '')
    const barOuter = document.createElement('div')
    barOuter.className = 'poll-bar-outer'
    const barInner = document.createElement('div')
    barInner.className = 'poll-bar-inner'
    barInner.style.width = pct + '%'
    barOuter.appendChild(barInner)
    const label = document.createElement('span')
    label.className = 'poll-label'
    label.textContent = opt
    const info = document.createElement('span')
    info.className = 'poll-info'
    info.textContent = count + ' (' + pct + '%)'
    row.appendChild(barOuter)
    row.appendChild(label)
    row.appendChild(info)
    row.addEventListener('click', (e) => { e.stopPropagation(); votePoll(post.id, opt) })
    pollDiv.appendChild(row)
  }
  container.appendChild(pollDiv)
}

function votePoll(postId, option) {
  const all = getPosts()
  const p = all.find(x => x.id === postId)
  if (!p || !p.poll) return
  const votes = p.poll.votes
  for (const opt of p.poll.options) {
    votes[opt] = (votes[opt] || []).filter(u => u !== loggedInUser)
  }
  if (!(votes[option] || []).includes(loggedInUser)) {
    votes[option] = votes[option] || []
    votes[option].push(loggedInUser)
  }
  savePosts(all)
  renderPosts()
  const detail = document.getElementById('detail-modal')
  if (!detail.classList.contains('hidden')) openDetail(postId)
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

  if (post.accountName === loggedInUser || _forceDeleteMode) {
    const delBtn = document.createElement('button')
    delBtn.className = 'post-delete'
    delBtn.textContent = 'Delete'
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (confirm('Delete this post?')) {
        markPostDeleted(post.id)
        await supabaseDeletePost(post.id)
        const all = getPosts().filter(p => p.id !== post.id)
        localStorage.setItem('posts', JSON.stringify(all))
        renderPosts()
        syncWritePosts(all)
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

  const timeEl = document.createElement('span')
  timeEl.className = 'post-time'
  timeEl.textContent = timeAgo(post.createdAt)
  postEl.appendChild(timeEl)

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

  if (post.genre) {
    const genreEl = document.createElement('span')
    genreEl.className = 'genre-badge'
    genreEl.textContent = post.genre
    postEl.appendChild(genreEl)
  }

  renderPoll(post, postEl)

  if ((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0)) {
    const mediaDiv = document.createElement('div')
    mediaDiv.className = 'post-media'
    for (const url of (post.videos || [])) {
      const video = document.createElement('video')
      video.src = url
      video.controls = true
      mediaDiv.appendChild(video)
    }
    for (const url of (post.images || [])) {
      if (url && url.startsWith('data:')) {
        const wrapper = document.createElement('div')
        wrapper.className = 'media-wrapper'
        const loader = document.createElement('div')
        loader.className = 'media-loading'
        wrapper.appendChild(loader)
        const img = document.createElement('img')
        img.style.display = 'none'
        img.onload = () => { try { wrapper.removeChild(loader) } catch(e) {}; img.style.display = '' }
        img.onerror = () => { try { wrapper.removeChild(loader) } catch(e) {}; loader.className = 'media-error'; loader.textContent = 'Image failed to load' }
        img.src = url
        wrapper.appendChild(img)
        mediaDiv.appendChild(wrapper)
      }
    }
    if (mediaDiv.children.length === 0) { mediaDiv.textContent = '(media data unavailable)' }
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

document.getElementById('comment-submit').addEventListener('click', async () => {
  const input = document.getElementById('comment-input')
  const text = input.value.trim()
  if (!text || !currentDetailPostId) return
  input.value = ''

  const comment = {
    id: Date.now(),
    postId: currentDetailPostId,
    author: loggedInUser,
    text,
    likes: [],
    dislikes: [],
    pinned: false,
    pinnedBy: '',
    favorited: false,
    parentId: null,
    createdAt: new Date().toISOString()
  }
  await syncAddComment(currentDetailPostId, comment)
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
