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
  }
  return posts
}

function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts))
  syncWritePosts(posts)
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

function saveComments(postId, comments) {
  localStorage.setItem('comments_' + postId, JSON.stringify(comments))
  syncWriteComments(postId, comments)
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

// Profile picture (loaded after initSync populates data)
const profileImg = document.getElementById('profile-picture')

// Create button
document.getElementById('create').addEventListener('click', () => {
  window.location.href = '../CreatePost/create.html?user=' + encodeURIComponent(loggedInUser)
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

;(async function() {
  await initSync()
  await syncRefreshConversations()
  const data = getUserData()
  if (data.profilePic) profileImg.src = data.profilePic
  renderPosts()
  setInterval(async () => {
    await refreshPostsFromSupabase()
    renderPosts()
  }, 10000)
})()

// ─── Developer Console (F8) ─────────────
let devConsole = null
document.addEventListener('keydown', (e) => {
  if (e.key === 'F8') {
    e.preventDefault()
    if (devConsole) { devConsole.remove(); devConsole = null; return }
    devConsole = document.createElement('div')
    devConsole.id = 'dev-console'
    devConsole.innerHTML = '<div id="dev-header">Developer Console <button id="dev-close">&times;</button></div><div id="dev-body"></div>'
    document.body.appendChild(devConsole)
    document.getElementById('dev-close').onclick = () => { devConsole.remove(); devConsole = null }
    const body = document.getElementById('dev-body')
    const addBtn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; body.appendChild(b) }
    addBtn('Delete My Account', async () => {
      if (!confirm('Wipe your account forever? This removes EVERYTHING.')) return
      if (!confirm('Really? All posts, likes, comments, chats, friends — gone.')) return
      const user = loggedInUser
      // Remove likes/dislikes from all posts + delete own posts
      const allPosts = await supabaseGetPosts()
      for (const p of allPosts) {
        if ((p.likes || []).includes(user) || (p.dislikes || []).includes(user))
          await supabaseUpdatePost(p.id, { likes: (p.likes||[]).filter(u=>u!==user), dislikes: (p.dislikes||[]).filter(u=>u!==user) })
        if (p.author === user) await supabaseDeletePost(p.id)
      }
      // Delete all comments by user
      for (const p of allPosts) {
        const comments = await supabaseGetComments(p.id)
        for (const c of comments)
          if (c.author === user) await supabaseDeleteComment(c.id)
      }
      // Remove all friend relationships (both directions, any status)
      const friends = await supabaseGetFriends(user)
      for (const f of friends) await supabaseDeleteFriendRelationship(user, f)
      const reqs = await supabaseGetFriendRequests(user)
      for (const r of reqs) await supabaseDeleteFriendRelationship(r, user)
      const sent = await supabaseGetSentRequests(user)
      for (const s of sent) await supabaseDeleteFriendRelationship(user, s)
      // Remove from all conversations
      const convs = await supabaseGetUserConversations(user)
      for (const c of convs) {
        if (c.type === 'dm' || c.members.length <= 2) {
          await _sup('DELETE', 'conversations', { eq: { id: c.id } })
        } else {
          c.members = c.members.filter(m => m !== user)
          if (c.members.length > 0) await supabaseSaveConversation(c)
          else await _sup('DELETE', 'conversations', { eq: { id: c.id } })
        }
      }
      // Delete playlists
      const playlists = await supabaseGetPlaylists(user)
      for (const pl of playlists) await supabaseDeletePlaylist(pl.id)
      // Delete the user
      await supabaseDeleteUser(user)
      localStorage.clear()
      window.location.href = '../index.html'
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
  }
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
    supabaseUserExists(name).then(exists => {
      if (exists) { alert('Username already taken.'); return }
    })
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
        const msgBtn = document.createElement('button')
        msgBtn.textContent = 'Message'
        msgBtn.style.cssText = 'background:rgb(0,120,200);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;'
        msgBtn.addEventListener('click', async () => {
          clearChatPoll()
          card.innerHTML = ''
          const convId = await getOrCreateDM(u)
          await openChat(convId)
        })
        btnRow.appendChild(msgBtn)
        el.appendChild(btnRow)
      }
      card.appendChild(el)
    }
  })

  addMenuItem('Friends', () => {
    closeMenu()
    const card = document.getElementById('card')
    card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
    document.getElementById('back-btn').addEventListener('click', renderPosts)
    const friends = getFriends(loggedInUser)
    if (friends.length === 0) {
      card.innerHTML += '<p style="text-align:center;padding:40px;color:#999;">No friends yet. Add some from the Members list!</p>'
      return
    }
    const requests = getFriendRequests(loggedInUser)
    if (requests.length > 0) {
      const h3 = document.createElement('h3')
      h3.style.cssText = 'padding:0 16px;color:#ffa;'
      h3.textContent = 'Pending requests (' + requests.length + ')'
      card.appendChild(h3)
      for (const r of requests) {
        const rData = JSON.parse(localStorage.getItem('user_' + r) || '{}')
        const el = document.createElement('div')
        el.className = 'member-card'
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
          closeMenu()
          alert('You are now friends with ' + r + '!')
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
          closeMenu()
        })
        el.appendChild(decline)
        card.appendChild(el)
      }
    }
    const h3 = document.createElement('h3')
    h3.style.cssText = 'padding:0 16px;color:white;'
    h3.textContent = 'Your Friends (' + friends.length + ')'
    card.appendChild(h3)
    for (const f of friends) {
      const fData = JSON.parse(localStorage.getItem('user_' + f) || '{}')
      const el = document.createElement('div')
      el.className = 'member-card'
      const img = document.createElement('img')
      img.src = fData.profilePic || 'Guest.png'
      img.className = 'member-pfp'
      el.appendChild(img)
      const name = document.createElement('span')
      name.textContent = f
      name.style.fontWeight = 'bold'
      el.appendChild(name)
      const msgBtn = document.createElement('button')
      msgBtn.textContent = 'Message'
      msgBtn.style.cssText = 'background:rgb(0,120,200);color:white;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:12px;margin-left:auto;'
      msgBtn.addEventListener('click', async () => {
        clearChatPoll()
        card.innerHTML = ''
        const convId = await getOrCreateDM(f)
        await openChat(convId)
      })
      el.appendChild(msgBtn)
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

  addMenuItem('Chats', () => {
    closeMenu()
    renderChatList()
  })

  addMenuItem('Log Out', () => {
    localStorage.removeItem('loggedInUser')
    window.location.href = '../index.html'
  })

  addMenuItem('Delete Account', async () => {
    if (!confirm('Wipe your account forever? This removes EVERYTHING.')) return
    if (!confirm('Really? All posts, likes, comments, chats, friends — gone.')) return
    const user = loggedInUser
    const allPosts = await supabaseGetPosts()
    for (const p of allPosts) {
      if ((p.likes||[]).includes(user) || (p.dislikes||[]).includes(user))
        await supabaseUpdatePost(p.id, { likes: (p.likes||[]).filter(u=>u!==user), dislikes: (p.dislikes||[]).filter(u=>u!==user) })
      if (p.author === user) await supabaseDeletePost(p.id)
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
  clearChatPoll()
  const card = document.getElementById('card')
  card.classList.remove('chat-card')
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

// ─── Chat System ─────────────────────────

function userExists(username) {
  return localStorage.getItem('user_' + username) !== null
}

function getConversationId(user1, user2) {
  return [user1, user2].sort().join('_')
}

function getConversationsForUser(username) {
  return JSON.parse(localStorage.getItem('convs_' + username) || '[]')
}

function addConvForUser(username, convId) {
  const list = getConversationsForUser(username)
  if (!list.includes(convId)) {
    list.push(convId)
    localStorage.setItem('convs_' + username, JSON.stringify(list))
  }
}

function removeConvForUser(username, convId) {
  const list = getConversationsForUser(username).filter(c => c !== convId)
  localStorage.setItem('convs_' + username, JSON.stringify(list))
}

async function getConversation(convId) {
  return await syncGetOrCreateConversation(convId, null)
}

function saveConversation(convId, data) {
  localStorage.setItem('conv_' + convId, JSON.stringify(data))
  supabaseSaveConversation(data)
}

function getMessages(convId) {
  return syncGetMessages(convId)
}

function saveMessages(convId, msgs) {
  localStorage.setItem('msgs_' + convId, JSON.stringify(msgs))
  syncSaveMessages(convId, msgs)
}

function migrateChat(convId) {
  syncMigrateChat(convId)
}

function getConvDisplayName(conv) {
  if (conv.name) return conv.name
  if (conv.type === 'dm') {
    const other = conv.members.find(m => m !== loggedInUser)
    return (conv.nicknames && conv.nicknames[other]) || other
  }
  return 'Group (' + conv.members.length + ')'
}

function getConvMemberName(conv, username) {
  return (conv.nicknames && conv.nicknames[username]) || username
}

async function getOrCreateDM(otherUser) {
  const convId = getConversationId(loggedInUser, otherUser)
  let conv = await getConversation(convId)
  if (!conv) {
    conv = {
      id: convId,
      type: 'dm',
      name: null,
      nicknames: {},
      background: null,
      style: 'default',
      members: [loggedInUser, otherUser],
      createdAt: Date.now()
    }
    saveConversation(convId, conv)
    addConvForUser(loggedInUser, convId)
    addConvForUser(otherUser, convId)
  }
  return convId
}

async function getAllConversations() {
  const convIds = getConversationsForUser(loggedInUser)
  const convs = []
  for (const id of convIds) {
    const conv = await getConversation(id)
    if (!conv) continue
    migrateChat(id)
    const msgs = getMessages(id)
    convs.push({
      conv,
      lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : null,
      unread: msgs.filter(m => m.from !== loggedInUser && !m.read).length
    })
  }
  convs.sort((a, b) => {
    if (!a.lastMessage) return 1
    if (!b.lastMessage) return -1
    return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
  })
  return convs
}

// ─── Chat List ─────────────────────────
async function renderChatList() {
  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
  document.getElementById('back-btn').addEventListener('click', () => {
    clearChatPoll()
    renderPosts()
  })

  const createGroupBtn = document.createElement('button')
  createGroupBtn.textContent = '+ New Group'
  createGroupBtn.style.cssText = 'margin:10px;padding:6px 14px;background:rgb(0,140,60);color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;float:right;'
  createGroupBtn.addEventListener('click', async () => { clearChatPoll(); await createGroupChat() })
  document.getElementById('back-btn').after(createGroupBtn)

  const allConvs = await getAllConversations()

  const h3 = document.createElement('h3')
  h3.style.cssText = 'padding:0 16px;color:white;clear:both;'
  h3.textContent = 'Your Conversations'
  card.appendChild(h3)

  if (allConvs.length === 0) {
    const p = document.createElement('p')
    p.className = 'chat-list-header'
    p.textContent = 'No conversations yet. Start one from the Members list!'
    card.appendChild(p)
    return
  }

  for (const c of allConvs) {
    const conv = c.conv
    const el = document.createElement('div')
    el.className = 'post'
    el.style.cursor = 'pointer'

    const header = document.createElement('div')
    header.className = 'post-header'

    const displayName = getConvDisplayName(conv)
    const isGroup = conv.type === 'group'

    const avatar = document.createElement('div')
    avatar.style.cssText = 'width:40px;height:40px;border-radius:50%;background:rgb(70,70,70);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;'
    avatar.textContent = isGroup ? '👥' : displayName[0].toUpperCase()
    header.appendChild(avatar)

    const name = document.createElement('span')
    name.className = 'post-name'
    name.textContent = displayName
    header.appendChild(name)

    if (c.unread > 0) {
      const badge = document.createElement('span')
      badge.className = 'chat-unread'
      badge.textContent = c.unread
      header.appendChild(badge)
    }

    el.appendChild(header)

    if (c.lastMessage) {
      const prev = document.createElement('p')
      prev.className = 'chat-preview'
      const fromName = getConvMemberName(conv, c.lastMessage.from)
      prev.textContent = (c.lastMessage.from === loggedInUser ? 'You: ' : fromName + ': ') + c.lastMessage.text
      el.appendChild(prev)
    }

    el.addEventListener('click', async () => {
      clearChatPoll()
      await openChat(conv.id)
    })
    card.appendChild(el)
  }
}

function clearChatPoll() {
  if (window._chatPollInterval) {
    clearInterval(window._chatPollInterval)
    window._chatPollInterval = null
  }
}

// ─── Open Chat ─────────────────────────
async function openChat(convId) {
  const conv = await getConversation(convId)
  if (!conv) { renderChatList(); return }

  const card = document.getElementById('card')
  migrateChat(convId)

  syncMarkMessagesRead(convId)

  card.innerHTML = '<button id="chat-back" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back to chats</button>'
  card.classList.add('chat-card')

  document.getElementById('chat-back').addEventListener('click', async () => {
    card.classList.remove('chat-card')
    clearChatPoll()
    await renderChatList()
  })

  const header = document.createElement('div')
  header.style.cssText = 'display:flex;align-items:center;padding:8px 16px;border-bottom:1px solid #555;flex-shrink:0;'

  const titleSpan = document.createElement('span')
  titleSpan.style.cssText = 'font-weight:bold;font-size:18px;color:white;flex:1;'
  titleSpan.textContent = getConvDisplayName(conv)
  header.appendChild(titleSpan)

  const settingsBtn = document.createElement('button')
  settingsBtn.textContent = '⚙'
  settingsBtn.style.cssText = 'background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;padding:0 4px;'
  settingsBtn.addEventListener('click', async () => await openChatSettings(convId))
  header.appendChild(settingsBtn)

  card.appendChild(header)

  const messagesDiv = document.createElement('div')
  messagesDiv.className = 'chat-messages'
  messagesDiv.id = 'chat-messages'

  if (conv.background) {
    if (conv.background.startsWith('#') || conv.background.startsWith('rgb')) {
      messagesDiv.style.background = conv.background
    } else {
      messagesDiv.style.backgroundImage = 'url(' + conv.background + ')'
      messagesDiv.style.backgroundSize = 'cover'
    }
  }

  card.appendChild(messagesDiv)

  const inputRow = document.createElement('div')
  inputRow.className = 'chat-input-row'

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'chat-input'
  input.id = 'chat-input'
  input.placeholder = 'Type a message...'
  inputRow.appendChild(input)

  const sendBtn = document.createElement('button')
  sendBtn.className = 'chat-send'
  sendBtn.id = 'chat-send'
  sendBtn.textContent = 'Send'
  inputRow.appendChild(sendBtn)

  card.appendChild(inputRow)

  async function sendMessage() {
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    await syncSendMessage(convId, text)
    renderMessagesInChat(convId)
  }

  sendBtn.addEventListener('click', sendMessage)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage()
  })

  renderMessagesInChat(convId)

  clearChatPoll()
  window._chatPollInterval = setInterval(async () => {
    await renderMessagesInChat(convId, true)
  }, 3000)
}

async function renderMessagesInChat(convId, isPolling) {
  const messagesDiv = document.getElementById('chat-messages')
  if (!messagesDiv) return

  const conv = await getConversation(convId)
  if (!conv) return

  const all = getMessages(convId)

  syncMarkMessagesRead(convId)

  if (!isPolling) {
    messagesDiv.innerHTML = ''
    if (all.length === 0) {
      const p = document.createElement('p')
      p.style.cssText = 'color:#999;text-align:center;padding:20px;'
      p.textContent = 'No messages yet. Say hi!'
      messagesDiv.appendChild(p)
      return
    }
    for (const m of all) appendMessageEl(messagesDiv, m, conv)
    messagesDiv.scrollTop = messagesDiv.scrollHeight
  } else {
    const count = messagesDiv.children.length
    if (count === 1 && messagesDiv.children[0].tagName === 'P') {
      messagesDiv.innerHTML = ''
      for (const m of all) appendMessageEl(messagesDiv, m, conv)
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    } else if (all.length > count) {
      for (let i = count; i < all.length; i++) appendMessageEl(messagesDiv, all[i], conv)
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  }
}

function appendMessageEl(container, m, conv) {
  const el = document.createElement('div')
  const isOwn = m.from === loggedInUser
  const style = (conv && conv.style) || 'default'
  el.className = 'chat-bubble style-' + style + ' ' + (isOwn ? 'own' : 'other')
  if (conv && conv.type === 'group' && !isOwn) {
    const nameEl = document.createElement('div')
    nameEl.style.cssText = 'font-size:11px;color:rgb(150,200,255);margin-bottom:2px;'
    nameEl.textContent = getConvMemberName(conv, m.from)
    el.appendChild(nameEl)
  }
  const text = document.createElement('span')
  text.textContent = m.text
  el.appendChild(text)
  const time = document.createElement('span')
  time.className = 'chat-time'
  time.textContent = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  el.appendChild(time)
  container.appendChild(el)
}

// ─── Chat Settings ────────────────────
async function openChatSettings(convId) {
  const conv = await getConversation(convId)
  if (!conv) return

  const overlay = document.getElementById('detail-overlay')
  const modal = document.getElementById('detail-modal')
  if (!overlay || !modal) return

  overlay.classList.remove('hidden')
  modal.classList.remove('hidden')
  modal.innerHTML = ''

  const header = document.createElement('div')
  header.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;background:rgb(50,50,50);border-bottom:1px solid #555;flex-shrink:0;'

  const backBtn = document.createElement('button')
  backBtn.textContent = '← Back'
  backBtn.style.cssText = 'background:rgb(70,70,70);color:white;border:none;border-radius:5px;padding:6px 16px;cursor:pointer;font-size:14px;'
  backBtn.addEventListener('click', () => {
    overlay.classList.add('hidden')
    modal.classList.add('hidden')
  })
  header.appendChild(backBtn)

  const title = document.createElement('span')
  title.style.cssText = 'flex:1;font-weight:bold;font-size:20px;color:white;'
  title.textContent = 'Chat Settings'
  header.appendChild(title)
  modal.appendChild(header)

  const body = document.createElement('div')
  body.style.cssText = 'flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;'

  function addLabel(text) {
    const l = document.createElement('label')
    l.style.cssText = 'color:white;font-weight:bold;'
    l.textContent = text
    body.appendChild(l)
  }

  addLabel(conv.type === 'group' ? 'Group Name' : 'Chat Name')
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.value = conv.name || ''
  nameInput.placeholder = conv.type === 'group' ? 'Group name...' : 'Chat name (optional)...'
  nameInput.style.cssText = 'padding:8px;border-radius:5px;border:1px solid #555;background:rgb(40,40,40);color:rgb(220,220,220);outline:none;'
  nameInput.addEventListener('input', () => {
    conv.name = nameInput.value.trim() || null
    saveConversation(convId, conv)
  })
  body.appendChild(nameInput)

  addLabel('Nicknames')
  for (const member of conv.members) {
    if (member === loggedInUser) continue
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:8px;align-items:center;'
    const mName = document.createElement('span')
    mName.style.cssText = 'color:#aaa;font-size:13px;width:80px;'
    mName.textContent = member
    row.appendChild(mName)
    const nickInput = document.createElement('input')
    nickInput.type = 'text'
    nickInput.value = (conv.nicknames && conv.nicknames[member]) || ''
    nickInput.placeholder = 'Nickname...'
    nickInput.style.cssText = 'flex:1;padding:6px;border-radius:5px;border:1px solid #555;background:rgb(40,40,40);color:rgb(220,220,220);outline:none;font-size:13px;'
    nickInput.addEventListener('input', () => {
      if (!conv.nicknames) conv.nicknames = {}
      if (nickInput.value.trim()) {
        conv.nicknames[member] = nickInput.value.trim()
      } else {
        delete conv.nicknames[member]
      }
      saveConversation(convId, conv)
    })
    row.appendChild(nickInput)
    body.appendChild(row)
  }

  addLabel('Background')
  const bgRow = document.createElement('div')
  bgRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;'
  const colors = ['', '#2d2d2d', '#1a3a2a', '#2a1a3a', '#3a2a1a', '#1a2a3a', '#3a1a1a']
  for (const c of colors) {
    const btn = document.createElement('button')
    btn.style.cssText = 'width:32px;height:32px;border-radius:50%;border:2px solid ' + ((!c && !conv.background) || (c === conv.background) ? '#fff' : 'transparent') + ';cursor:pointer;'
    if (c) {
      btn.style.background = c
    } else {
      btn.style.background = 'rgb(60,60,60)'
      btn.textContent = '↺'
      btn.style.cssText = btn.style.cssText + ';color:#aaa;font-size:16px;display:flex;align-items:center;justify-content:center;'
    }
    btn.addEventListener('click', () => {
      conv.background = c || null
      saveConversation(convId, conv)
      const md = document.getElementById('chat-messages')
      if (md) {
        if (c) { md.style.background = c; md.style.backgroundImage = '' }
        else { md.style.background = '' ; md.style.backgroundImage = '' }
      }
      openChatSettings(convId)
    })
    bgRow.appendChild(btn)
  }
  const bgUrlInput = document.createElement('input')
  bgUrlInput.type = 'text'
  bgUrlInput.value = (conv.background && !conv.background.startsWith('#') && !conv.background.startsWith('rgb')) ? conv.background : ''
  bgUrlInput.placeholder = 'Or image URL...'
  bgUrlInput.style.cssText = 'padding:6px;border-radius:5px;border:1px solid #555;background:rgb(40,40,40);color:rgb(220,220,220);outline:none;font-size:13px;min-width:150px;flex:1;'
  bgUrlInput.addEventListener('input', () => {
    conv.background = bgUrlInput.value.trim() || null
    saveConversation(convId, conv)
    const md = document.getElementById('chat-messages')
    if (md) {
      if (conv.background && !conv.background.startsWith('#') && !conv.background.startsWith('rgb')) {
        md.style.backgroundImage = 'url(' + conv.background + ')'; md.style.backgroundSize = 'cover'
      } else if (conv.background) {
        md.style.background = conv.background; md.style.backgroundImage = ''
      } else {
        md.style.background = '' ; md.style.backgroundImage = ''
      }
    }
  })
  bgRow.appendChild(bgUrlInput)
  body.appendChild(bgRow)

  addLabel('Bubble Style')
  const styleRow = document.createElement('div')
  styleRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;'
  const styles = ['default', 'green', 'purple', 'orange', 'pink', 'dark']
  const styleNames = ['Default', 'Green', 'Purple', 'Orange', 'Pink', 'Dark']
  for (let i = 0; i < styles.length; i++) {
    const btn = document.createElement('button')
    btn.textContent = styleNames[i]
    const active = (conv.style === styles[i]) || (!conv.style && styles[i] === 'default')
    btn.style.cssText = 'padding:6px 14px;border-radius:5px;border:2px solid ' + (active ? '#fff' : '#555') + ';cursor:pointer;background:rgb(60,60,60);color:rgb(220,220,220);font-size:13px;'
    btn.addEventListener('click', () => {
      conv.style = styles[i]
      saveConversation(convId, conv)
      openChatSettings(convId)
    })
    styleRow.appendChild(btn)
  }
  body.appendChild(styleRow)

  if (conv.type === 'group') {
    addLabel('Members (' + conv.members.length + ')')
    for (const m of conv.members) {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;'
      const mData = JSON.parse(localStorage.getItem('user_' + m) || '{}')
      const img = document.createElement('img')
      img.src = mData.profilePic || 'Guest.png'
      img.style.cssText = 'width:30px;height:30px;border-radius:50%;object-fit:cover;'
      row.appendChild(img)
      const name = document.createElement('span')
      name.style.cssText = 'color:rgb(200,200,200);font-size:14px;flex:1;'
      name.textContent = m + (m === loggedInUser ? ' (you)' : '')
      row.appendChild(name)
      if (m !== loggedInUser) {
        const removeBtn = document.createElement('button')
        removeBtn.textContent = 'Remove'
        removeBtn.style.cssText = 'background:rgb(180,50,50);color:white;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;'
        removeBtn.addEventListener('click', () => {
          if (confirm('Remove ' + m + ' from this group?')) {
            conv.members = conv.members.filter(x => x !== m)
            saveConversation(convId, conv)
            removeConvForUser(m, convId)
            openChatSettings(convId)
          }
        })
        row.appendChild(removeBtn)
      }
      body.appendChild(row)
    }
    const addBtn = document.createElement('button')
    addBtn.textContent = '+ Add Members'
    addBtn.style.cssText = 'background:rgb(0,120,200);color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-size:13px;align-self:flex-start;'
    addBtn.addEventListener('click', () => {
      const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
      const available = users.filter(u => u !== loggedInUser && !conv.members.includes(u))
      if (available.length === 0) { alert('No other users to add.'); return }
      const choice = prompt('Enter username to add:\n' + available.join('\n'))
      if (choice && available.includes(choice.trim())) {
        conv.members.push(choice.trim())
        saveConversation(convId, conv)
        addConvForUser(choice.trim(), convId)
        openChatSettings(convId)
      }
    })
    body.appendChild(addBtn)
  }

  modal.appendChild(body)
}

// ─── Group Chat ───────────────────────
function createGroupChat() {
  const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
  const available = users.filter(u => u !== loggedInUser)
  if (available.length === 0) { alert('No other users to add.'); return }

  const card = document.getElementById('card')
  card.innerHTML = '<button id="back-btn" style="margin:10px;padding:8px 16px;cursor:pointer;">← Back</button>'
  document.getElementById('back-btn').addEventListener('click', () => {
    clearChatPoll()
    renderPosts()
  })

  const h3 = document.createElement('h3')
  h3.style.cssText = 'padding:0 16px;color:white;'
  h3.textContent = 'Select members for group chat'
  card.appendChild(h3)

  const selected = []
  for (const u of available) {
    const el = document.createElement('div')
    el.className = 'member-card'
    el.style.cursor = 'pointer'
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.style.cssText = 'transform:scale(1.3);'
    cb.addEventListener('change', () => {
      if (cb.checked) { selected.push(u) } else { const idx = selected.indexOf(u); if (idx !== -1) selected.splice(idx, 1) }
    })
    el.appendChild(cb)
    const uData = JSON.parse(localStorage.getItem('user_' + u) || '{}')
    const img = document.createElement('img')
    img.src = uData.profilePic || 'Guest.png'
    img.className = 'member-pfp'
    el.appendChild(img)
    const nameSpan = document.createElement('span')
    nameSpan.style.cssText = 'font-weight:bold;'
    nameSpan.textContent = u
    el.appendChild(nameSpan)
    card.appendChild(el)
  }

  const createBtn = document.createElement('button')
  createBtn.textContent = 'Create Group'
  createBtn.style.cssText = 'display:block;margin:16px auto;padding:10px 24px;background:rgb(0,140,60);color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;'
  createBtn.addEventListener('click', async () => {
    if (selected.length < 1) { alert('Select at least one person.'); return }
    const groupName = prompt('Group name:') || 'Group'
    const convId = 'group_' + Date.now()
    const allMembers = [loggedInUser, ...selected]
    const conv = {
      id: convId, type: 'group', name: groupName,
      nicknames: {}, background: null, style: 'default',
      members: allMembers, createdAt: Date.now()
    }
    await syncSaveConversation(conv)
    saveMessages(convId, [])
    for (const m of allMembers) await syncAddConvForUser(m, convId)
    clearChatPoll()
    card.innerHTML = ''
    await openChat(convId)
  })
  card.appendChild(createBtn)
}

renderPosts()
