// ─── Field mapping helpers ────────────────
function postFromSupabase(p) {
  const raw = p.tags || ''
  const tags = typeof raw === 'string' && raw
    ? raw.replace(/^\[|\]$/g, '').replace(/"/g, '').split(',').map(t => t.trim()).filter(Boolean)
    : Array.isArray(raw) ? raw : []
  let mediaArr = p.media
  if (typeof mediaArr === 'string') { try { mediaArr = JSON.parse(mediaArr) } catch(e) { mediaArr = [] } }
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    tags,
    images: (mediaArr || []).filter(m => m.type !== 'video').map(m => m.url || m).filter(Boolean),
    videos: (mediaArr || []).filter(m => m.type === 'video').map(m => m.url || m).filter(Boolean),
    accountName: p.author,
    profilePic: p.author_pic || 'Guest.png',
    pinned: p.pinned || false,
    favorited: p.favorited || false,
    likes: p.likes || [],
    dislikes: p.dislikes || [],
    createdAt: p.created_at
  }
}

function postToSupabase(p) {
  const media = []
  for (const img of (p.images || [])) media.push({ type: 'image', url: img })
  for (const vid of (p.videos || [])) media.push({ type: 'video', url: vid })
  return {
    id: p.id,
    title: p.title,
    description: p.description || '',
    tags: Array.isArray(p.tags) ? p.tags.join(',') : (p.tags || ''),
    media,
    author: p.accountName,
    author_pic: p.profilePic || 'Guest.png',
    pinned: p.pinned || false,
    favorited: p.favorited || false,
    likes: p.likes || [],
    dislikes: p.dislikes || [],
    created_at: p.createdAt || new Date().toISOString()
  }
}

function commentFromSupabase(c) {
  return { id: c.id, postId: c.post_id, author: c.author, text: c.text, likes: c.likes || [], dislikes: c.dislikes || [], pinned: !!c.pinned, pinnedBy: c.pinned_by || '', favorited: !!c.favorited, parentId: c.parent_id || null, createdAt: c.created_at }
}

function commentToSupabase(c) {
  return { post_id: c.postId, author: c.author, text: c.text, likes: c.likes || [], dislikes: c.dislikes || [], pinned: c.pinned || false, pinned_by: c.pinnedBy || '', favorited: c.favorited || false, parent_id: c.parentId || null, created_at: c.createdAt }
}

function userFromSupabase(u) {
  return { email: u.email || '', profilePic: u.profile_pic || 'Guest.png' }
}

function userToSupabase(u) {
  return { email: u.email || '', profile_pic: u.profilePic || 'Guest.png' }
}

// ─── Init: pull all data from Supabase into localStorage ───
async function initSync() {
  const existingPosts = JSON.parse(localStorage.getItem('posts') || '[]')
  const existingIds = new Set(existingPosts.map(p => p.id))

  const [supaPosts, registered] = await Promise.all([
    supabaseGetPosts(),
    supabaseGetAllUsers()
  ])

  // Upload any local-only posts to Supabase (data not yet synced)
  const deletedIds = JSON.parse(localStorage.getItem('deletedPostIds') || '[]')
  for (const p of existingPosts) {
    if (typeof p.id === 'number' && !supaPosts.find(s => s.id === p.id) && !deletedIds.includes(p.id)) {
      const result = await supabaseCreatePost(postToSupabase(p))
      if (result) p.id = result.id
    }
  }

  // Merge: Supabase posts win, but keep local-only posts
  const supaLocal = supaPosts.map(postFromSupabase)
  const mergedIds = new Set(supaLocal.map(p => p.id))
  for (const p of existingPosts) {
    if (!mergedIds.has(p.id)) supaLocal.push(p)
  }
  localStorage.setItem('posts', JSON.stringify(supaLocal))

  // Register all usernames
  localStorage.setItem('registeredUsers', JSON.stringify(registered))

  // Sync comments for Supabase posts
  for (const p of supaPosts) {
    if (!localStorage.getItem('comments_' + p.id)) {
      const comments = await supabaseGetComments(p.id)
      localStorage.setItem('comments_' + p.id, JSON.stringify(comments.map(commentFromSupabase)))
    }
  }

  // Fetch logged-in user data first
  const myData = await supabaseGetUser(loggedInUser)
  if (myData) localStorage.setItem('user_' + loggedInUser, JSON.stringify(userFromSupabase(myData)))

  // Pre-fetch other user profiles (but don't block on this)
  for (const u of registered) {
    if (u === loggedInUser) continue
    if (!localStorage.getItem('user_' + u)) {
      const userData = await supabaseGetUser(u)
      if (userData) localStorage.setItem('user_' + u, JSON.stringify(userFromSupabase(userData)))
    }
  }
}

// ─── Periodic refresh ─────────────────────
async function refreshPostsFromSupabase() {
  const [posts, registered] = await Promise.all([
    supabaseGetPosts(),
    supabaseGetAllUsers()
  ])
  localStorage.setItem('registeredUsers', JSON.stringify(registered))
  const localPosts = posts.map(postFromSupabase)
  const existing = JSON.parse(localStorage.getItem('posts') || '[]')
  for (const lp of localPosts) {
    const found = existing.find(e => e.id === lp.id)
    if (found) {
      lp.likes = found.likes
      lp.dislikes = found.dislikes
      lp.pinned = found.pinned
      lp.favorited = found.favorited
    }
  }
  localStorage.setItem('posts', JSON.stringify(localPosts))
}

// ─── Sync writes: localStorage + Supabase ───

function markPostDeleted(id) {
  const deleted = JSON.parse(localStorage.getItem('deletedPostIds') || '[]')
  if (!deleted.includes(id)) { deleted.push(id); localStorage.setItem('deletedPostIds', JSON.stringify(deleted)) }
}

async function syncWritePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts))
  const existing = await supabaseGetPosts()
  const existingIds = new Set(existing.map(p => p.id))
  const deletedIds = JSON.parse(localStorage.getItem('deletedPostIds') || '[]')
  for (const p of posts) {
    if (existingIds.has(p.id)) {
      const { id, ...upd } = postToSupabase(p)
      await supabaseUpdatePost(p.id, upd)
    } else if (typeof p.id === 'number' && p.id > 1000000 && !deletedIds.includes(p.id)) {
      const result = await supabaseCreatePost(postToSupabase(p))
      if (result) p.id = result.id
    }
  }
  const localIds = new Set(posts.map(p => p.id))
  for (const eid of existingIds) {
    if (!localIds.has(eid)) await supabaseDeletePost(eid)
  }
  localStorage.setItem('posts', JSON.stringify(posts))
}

async function syncCreatePost(post) {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]')
  const result = await supabaseCreatePost(postToSupabase(post))
  if (result) post.id = result.id
  posts.unshift(post)
  localStorage.setItem('posts', JSON.stringify(posts))
}

async function syncUpdatePost(postId, updates) {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]')
  const idx = posts.findIndex(p => p.id === postId)
  if (idx !== -1) {
    Object.assign(posts[idx], updates)
    localStorage.setItem('posts', JSON.stringify(posts))
  }
  await supabaseUpdatePost(postId, postToSupabase(updates))
}

async function syncDeletePost(postId) {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]').filter(p => p.id !== postId)
  localStorage.setItem('posts', JSON.stringify(posts))
  await supabaseDeletePost(postId)
}

async function syncWriteComments(postId, comments) {
  localStorage.setItem('comments_' + postId, JSON.stringify(comments))
  const existing = await supabaseGetComments(postId)
  for (const c of existing) {
    if (!comments.find(lc => lc.id === c.id)) await supabaseDeleteComment(c.id)
  }
  for (const c of comments) {
    if (!c.id || c.id.toString().startsWith('local_')) {
      const supabaseC = commentToSupabase(c)
      supabaseC.post_id = postId
      const result = await supabaseCreateComment(supabaseC)
      if (result) c.id = result.id
    } else {
      await supabaseUpdateComment(c.id, commentToSupabase(c))
    }
  }
}

async function syncAddComment(postId, comment) {
  const key = 'comments_' + postId
  const comments = JSON.parse(localStorage.getItem(key) || '[]')
  const supabaseC = commentToSupabase(comment)
  supabaseC.post_id = postId
  const result = await supabaseCreateComment(supabaseC)
  if (result) comment.id = result.id
  comments.push(comment)
  localStorage.setItem(key, JSON.stringify(comments))
}

async function syncUpdateComment(commentId, updates) {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('comments_')) {
      const comments = JSON.parse(localStorage.getItem(key) || '[]')
      const idx = comments.findIndex(c => c.id === commentId)
      if (idx !== -1) {
        Object.assign(comments[idx], updates)
        localStorage.setItem(key, JSON.stringify(comments))
        break
      }
    }
  }
  const supabaseUpdates = {}
  if (updates.likes !== undefined) supabaseUpdates.likes = updates.likes
  if (updates.dislikes !== undefined) supabaseUpdates.dislikes = updates.dislikes
  if (updates.text !== undefined) supabaseUpdates.text = updates.text
  await supabaseUpdateComment(commentId, supabaseUpdates)
}

async function syncDeleteComment(commentId) {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('comments_')) {
      const comments = JSON.parse(localStorage.getItem(key) || '[]')
      const filtered = comments.filter(c => c.id !== commentId)
      if (filtered.length !== comments.length) {
        localStorage.setItem(key, JSON.stringify(filtered))
        break
      }
    }
  }
  await supabaseDeleteComment(commentId)
}

async function syncWriteUser(username, data) {
  localStorage.setItem('user_' + username, JSON.stringify(data))
  await supabaseUpdateUser(username, userToSupabase(data))
}

async function syncWritePlaylists(owner, playlists) {
  localStorage.setItem('playlist_' + owner, JSON.stringify(playlists))
  const existing = await supabaseGetPlaylists(owner)
  for (const p of existing) {
    if (!playlists.find(lp => lp.id === p.id)) await supabaseDeletePlaylist(p.id)
  }
  for (const p of playlists) {
    if (!p.id || p.id.toString().startsWith('local_')) {
      const result = await supabaseCreatePlaylist({ name: p.name, owner, posts: p.posts || [] })
      if (result) p.id = result.id
    } else {
      await supabaseUpdatePlaylist(p.id, { name: p.name, posts: p.posts || [] })
    }
  }
}

// ─── Friend sync ──────────────────────────
async function syncRefreshFriends(username) {
  const [friends, requests, sent] = await Promise.all([
    supabaseGetFriends(username),
    supabaseGetFriendRequests(username),
    supabaseGetSentRequests(username)
  ])
  localStorage.setItem('friends_' + username, JSON.stringify(friends))
  localStorage.setItem('fr_requests_' + username, JSON.stringify(requests))
  localStorage.setItem('fr_sent_' + username, JSON.stringify(sent))
  return { friends, requests, sent }
}

// ─── Chat sync ────────────────────────────
async function syncRefreshConversations() {
  const convs = await supabaseGetUserConversations(loggedInUser)
  const convIds = convs.map(c => c.id)
  localStorage.setItem('convs_' + loggedInUser, JSON.stringify(convIds))
  for (const c of convs) {
    localStorage.setItem('conv_' + c.id, JSON.stringify(c))
    const msgs = await supabaseGetMessages(c.id)
    localStorage.setItem('msgs_' + c.id, JSON.stringify(msgs.map(m => ({
      id: m.id,
      from: m.sender,
      text: m.text,
      read: m.read,
      createdAt: m.created_at
    }))))
    localStorage.setItem('chats_' + c.id, JSON.stringify(msgs.map(m => ({
      id: m.id,
      from: m.sender,
      to: m.sender === loggedInUser ? c.members.find(x => x !== loggedInUser) : loggedInUser,
      text: m.text,
      read: m.read,
      createdAt: m.created_at
    }))))
  }
  return convs
}

function syncGetMessages(convId) {
  return JSON.parse(localStorage.getItem('msgs_' + convId) || '[]')
}

async function syncSendMessage(convId, text) {
  const msg = {
    conversation_id: convId,
    sender: loggedInUser,
    text,
    read: false,
    created_at: new Date().toISOString()
  }
  const result = await supabaseAddMessage(msg)
  if (result) {
    const msgs = syncGetMessages(convId)
    msgs.push({ id: result.id, from: loggedInUser, text, read: false, createdAt: result.created_at })
    localStorage.setItem('msgs_' + convId, JSON.stringify(msgs))
    const conv = JSON.parse(localStorage.getItem('conv_' + convId) || '{}')
    const otherUser = conv.members ? conv.members.find(m => m !== loggedInUser) : ''
    const oldChats = JSON.parse(localStorage.getItem('chats_' + convId) || '[]')
    oldChats.push({ id: result.id, from: loggedInUser, to: otherUser, text, read: false, createdAt: result.created_at })
    localStorage.setItem('chats_' + convId, JSON.stringify(oldChats))
  }
}

async function syncMarkMessagesRead(convId) {
  const msgs = syncGetMessages(convId)
  let changed = false
  for (const m of msgs) {
    if (m.from !== loggedInUser && !m.read) { m.read = true; changed = true }
  }
  if (changed) {
    localStorage.setItem('msgs_' + convId, JSON.stringify(msgs))
    await supabaseMarkMessagesRead(convId, loggedInUser)
  }
}

async function syncSaveConversation(conv) {
  localStorage.setItem('conv_' + conv.id, JSON.stringify(conv))
  await supabaseSaveConversation(conv)
}

async function syncAddConvForUser(username, convId) {
  const convs = JSON.parse(localStorage.getItem('convs_' + username) || '[]')
  if (!convs.includes(convId)) {
    convs.push(convId)
    localStorage.setItem('convs_' + username, JSON.stringify(convs))
  }
}

async function syncRemoveConvForUser(username, convId) {
  const convs = JSON.parse(localStorage.getItem('convs_' + username) || '[]').filter(c => c !== convId)
  localStorage.setItem('convs_' + username, JSON.stringify(convs))
}

// ─── Friend write helpers ────────────

function syncWriteFriends(user, list) {
  localStorage.setItem('friends_' + user, JSON.stringify(list))
}

function syncWriteFriendRequests(user, list) {
  localStorage.setItem('fr_requests_' + user, JSON.stringify(list))
}

function syncWriteSentRequests(user, list) {
  localStorage.setItem('fr_sent_' + user, JSON.stringify(list))
}

async function syncAddFriendAsAccepted(user1, user2) {
  const existing = await _sup('GET', 'friends', {
    select: '*',
    or: 'and(user1.eq.' + user1 + ',user2.eq.' + user2 + '),and(user1.eq.' + user2 + ',user2.eq.' + user1 + ')',
    single: true
  })
  if (existing) {
    await _sup('PATCH', 'friends', { eq: { id: existing.id }, body: { status: 'accepted' } })
  } else {
    await _sup('POST', 'friends', { body: { user1, user2, status: 'accepted' } })
  }
}

async function syncDeleteFriendRequest(user1, user2) {
  await _sup('DELETE', 'friends', { eq: { user1, user2, status: 'pending' } })
}

async function syncDeleteFriendRelationship(username, other) {
  await _sup('DELETE', 'friends', { or: 'and(user1.eq.' + username + ',user2.eq.' + other + '),and(user1.eq.' + other + ',user2.eq.' + username + ')' })
}

async function syncSendFriendRequest(user1, user2) {
  await _sup('POST', 'friends', { body: { user1, user2, status: 'pending' } })
}

// ─── Chat write helpers ──────────────
async function syncSaveMessages(convId, msgs) {
  localStorage.setItem('msgs_' + convId, JSON.stringify(msgs))
}

async function syncGetConversation(convId) {
  let conv = JSON.parse(localStorage.getItem('conv_' + convId))
  if (!conv) {
    conv = await supabaseGetConversation(convId)
    if (conv) localStorage.setItem('conv_' + convId, JSON.stringify(conv))
  }
  return conv
}

async function syncMigrateChat(convId) {
  const oldKey = 'chats_' + convId
  const newKey = 'msgs_' + convId
  if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, localStorage.getItem(oldKey))
    localStorage.removeItem(oldKey)
  }
}

async function syncGetOrCreateConversation(convId, defaultConv) {
  let conv = JSON.parse(localStorage.getItem('conv_' + convId))
  if (!conv) {
    conv = await supabaseGetConversation(convId)
    if (conv) localStorage.setItem('conv_' + convId, JSON.stringify(conv))
  }
  if (!conv && defaultConv) {
    conv = defaultConv
    localStorage.setItem('conv_' + convId, JSON.stringify(conv))
    await supabaseSaveConversation(conv)
  }
  return conv
}
