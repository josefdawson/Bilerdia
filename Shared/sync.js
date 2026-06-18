// ─── Field mapping helpers ────────────────
function postFromSupabase(p) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    tags: p.tags || '',
    images: (p.media || []).filter(m => m.type !== 'video').map(m => m.url || m),
    videos: (p.media || []).filter(m => m.type === 'video').map(m => m.url || m),
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
    tags: p.tags || '',
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
  return { id: c.id, postId: c.post_id, author: c.author, text: c.text, likes: c.likes || [], dislikes: c.dislikes || [], createdAt: c.created_at }
}

function commentToSupabase(c) {
  return { post_id: c.postId, author: c.author, text: c.text, likes: c.likes || [], dislikes: c.dislikes || [], created_at: c.createdAt }
}

function userFromSupabase(u) {
  return { email: u.email || '', profilePic: u.profile_pic || 'Guest.png' }
}

function userToSupabase(u) {
  return { email: u.email || '', profile_pic: u.profilePic || 'Guest.png' }
}

// ─── Init: pull all data from Supabase into localStorage ───
async function initSync() {
  const [posts, registered] = await Promise.all([
    supabaseGetPosts(),
    supabaseGetAllUsers()
  ])
  // Register all usernames
  localStorage.setItem('registeredUsers', JSON.stringify(registered))
  // Convert and store posts
  const localPosts = []
  for (const p of posts) {
    localPosts.push(postFromSupabase(p))
    // Also sync comments for this post
    const comments = await supabaseGetComments(p.id)
    localStorage.setItem('comments_' + p.id, JSON.stringify(comments.map(commentFromSupabase)))
  }
  localStorage.setItem('posts', JSON.stringify(localPosts))
  // Pre-fetch all user profiles
  for (const u of registered) {
    const userData = await supabaseGetUser(u)
    if (userData) localStorage.setItem('user_' + u, JSON.stringify(userFromSupabase(userData)))
  }
}

// ─── Periodic refresh ─────────────────────
async function refreshPostsFromSupabase() {
  const posts = await supabaseGetPosts()
  const localPosts = posts.map(postFromSupabase)
  // Merge with existing to preserve any local-only state
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

async function syncWritePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts))
  const existing = await supabaseGetPosts()
  const existingIds = new Set(existing.map(p => p.id))
  for (const p of posts) {
    if (existingIds.has(p.id)) {
      // Update existing
      const sup = postToSupabase(p)
      const { id, ...upd } = sup
      await _supabase.from('posts').update(upd).eq('id', p.id)
    } else if (typeof p.id === 'number' && p.id > 1000000) {
      // Local post - insert into Supabase
      const { id, ...insertData } = postToSupabase(p)
      const { data } = await _supabase.from('posts').insert(insertData).select()
      if (data && data[0]) {
        p.id = data[0].id
      }
    }
  }
  // Remove deleted posts from Supabase
  const localIds = new Set(posts.map(p => p.id))
  for (const eid of existingIds) {
    if (!localIds.has(eid)) {
      await _supabase.from('posts').delete().eq('id', eid)
    }
  }
  localStorage.setItem('posts', JSON.stringify(posts))
}

async function syncCreatePost(post) {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]')
  const supabasePost = postToSupabase(post)
  const { data } = await _supabase.from('posts').insert(supabasePost).select()
  if (data && data[0]) {
    post.id = data[0].id
  }
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
  await _supabase.from('posts').update(postToSupabase(updates)).eq('id', postId)
}

async function syncDeletePost(postId) {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]').filter(p => p.id !== postId)
  localStorage.setItem('posts', JSON.stringify(posts))
  await _supabase.from('posts').delete().eq('id', postId)
}

async function syncWriteComments(postId, comments) {
  localStorage.setItem('comments_' + postId, JSON.stringify(comments))
  // For simplicity, replace all Supabase comments for this post
  const existing = await supabaseGetComments(postId)
  for (const c of existing) {
    if (!comments.find(lc => lc.id === c.id)) {
      await _supabase.from('comments').delete().eq('id', c.id)
    }
  }
  for (const c of comments) {
    if (!c.id || c.id.toString().startsWith('local_')) {
      const supabaseC = commentToSupabase(c)
      supabaseC.post_id = postId
      const { data } = await _supabase.from('comments').insert(supabaseC).select()
      if (data && data[0]) c.id = data[0].id
    } else {
      await _supabase.from('comments').update(commentToSupabase(c)).eq('id', c.id)
    }
  }
}

async function syncAddComment(postId, comment) {
  const key = 'comments_' + postId
  const comments = JSON.parse(localStorage.getItem(key) || '[]')
  const supabaseC = commentToSupabase(comment)
  supabaseC.post_id = postId
  const { data } = await _supabase.from('comments').insert(supabaseC).select()
  if (data && data[0]) comment.id = data[0].id
  comments.push(comment)
  localStorage.setItem(key, JSON.stringify(comments))
}

async function syncUpdateComment(commentId, updates) {
  // Update in localStorage
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
  // Update in Supabase
  const supabaseUpdates = {}
  if (updates.likes !== undefined) supabaseUpdates.likes = updates.likes
  if (updates.dislikes !== undefined) supabaseUpdates.dislikes = updates.dislikes
  if (updates.text !== undefined) supabaseUpdates.text = updates.text
  await _supabase.from('comments').update(supabaseUpdates).eq('id', commentId)
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
  await _supabase.from('comments').delete().eq('id', commentId)
}

async function syncWriteUser(username, data) {
  localStorage.setItem('user_' + username, JSON.stringify(data))
  await supabaseUpdateUser(username, userToSupabase(data))
}

async function syncWritePlaylists(owner, playlists) {
  localStorage.setItem('playlist_' + owner, JSON.stringify(playlists))
  const existing = await supabaseGetPlaylists(owner)
  for (const p of existing) {
    if (!playlists.find(lp => lp.id === p.id)) {
      await _supabase.from('playlists').delete().eq('id', p.id)
    }
  }
  for (const p of playlists) {
    if (!p.id || p.id.toString().startsWith('local_')) {
      const { data } = await _supabase.from('playlists').insert({ name: p.name, owner, posts: p.posts || [] }).select()
      if (data && data[0]) p.id = data[0].id
    } else {
      await _supabase.from('playlists').update({ name: p.name, posts: p.posts || [] }).eq('id', p.id)
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
  // Update convs_<username> list
  const convIds = convs.map(c => c.id)
  localStorage.setItem('convs_' + loggedInUser, JSON.stringify(convIds))
  for (const c of convs) {
    localStorage.setItem('conv_' + c.id, JSON.stringify(c))
    // Migrate messages
    const msgs = await supabaseGetMessages(c.id)
    localStorage.setItem('msgs_' + c.id, JSON.stringify(msgs.map(m => ({
      id: m.id,
      from: m.sender,
      text: m.text,
      read: m.read,
      createdAt: m.created_at
    }))))
    // Also write old format for compatibility
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
  const { data } = await _supabase.from('messages').insert(msg).select()
  if (data && data[0]) {
    const msgs = syncGetMessages(convId)
    msgs.push({ id: data[0].id, from: loggedInUser, text, read: false, createdAt: data[0].created_at })
    localStorage.setItem('msgs_' + convId, JSON.stringify(msgs))
    // Also update old format
    const conv = JSON.parse(localStorage.getItem('conv_' + convId) || '{}')
    const otherUser = conv.members ? conv.members.find(m => m !== loggedInUser) : ''
    const oldChats = JSON.parse(localStorage.getItem('chats_' + convId) || '[]')
    oldChats.push({ id: data[0].id, from: loggedInUser, to: otherUser, text, read: false, createdAt: data[0].created_at })
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
  // Supabase handles this via the conversation's members list
  // Just update local
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
// These write to localStorage for sync reads, and to Supabase for cross-device

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
  // Check if relationship exists in Supabase
  const { data: existing } = await _supabase.from('friends').select('*')
    .or('and(user1.eq.' + user1 + ',user2.eq.' + user2 + '),and(user1.eq.' + user2 + ',user2.eq.' + user1 + ')')
    .maybeSingle()
  if (existing) {
    await _supabase.from('friends').update({ status: 'accepted' }).eq('id', existing.id)
  } else {
    await _supabase.from('friends').insert({ user1, user2, status: 'accepted' })
  }
}

async function syncDeleteFriendRequest(user1, user2) {
  await _supabase.from('friends').delete()
    .eq('user1', user1).eq('user2', user2).eq('status', 'pending')
}

async function syncDeleteFriendRelationship(username, other) {
  await _supabase.from('friends').delete()
    .or('and(user1.eq.' + username + ',user2.eq.' + other + '),and(user1.eq.' + other + ',user2.eq.' + username + ')')
}

async function syncSendFriendRequest(user1, user2) {
  await _supabase.from('friends').insert({ user1, user2, status: 'pending' })
}

// ─── Chat write helpers ──────────────
async function syncSaveMessages(convId, msgs) {
  localStorage.setItem('msgs_' + convId, JSON.stringify(msgs))
  // For full sync, we'd need to diff. For now, just trust local writes
  // New messages are already sent via syncSendMessage
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
