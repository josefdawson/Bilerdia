const SUPABASE_URL = 'https://xhotvaezckemrjzozzal.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhob3R2YWV6Y2tlbXJqem96emFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODk1ODgsImV4cCI6MjA5NzM2NTU4OH0.kREPEfPMufXOPMT5UzqQcP0YJgHBRMRnwiDFpItWrTs'
const REST_URL = SUPABASE_URL + '/rest/v1'

let loggedInUser = new URLSearchParams(window.location.search).get('user') || sessionStorage.getItem('loggedInUser') || localStorage.getItem('loggedInUser') || ''

async function _sup(method, table, { select, eq, order, limit, or: orFilter, single, body } = {}) {
  const params = new URLSearchParams()
  if (select) params.set('select', select)
  if (order) params.set('order', order)
  if (limit) params.set('limit', limit)
  if (eq) { for (const [k, v] of Object.entries(eq)) params.append(k, 'eq.' + v) }
  if (orFilter) params.set('or', orFilter)
  const qs = params.toString()
  const url = REST_URL + '/' + table + (qs ? '?' + qs : '')
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
  if (method !== 'GET' && method !== 'DELETE') headers.Prefer = 'return=representation'
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) { console.error('Supabase', method, table, res.status); return null }
  if (method === 'DELETE') return true
  const data = await res.json()
  if (single && Array.isArray(data)) return data.length ? data[0] : null
  return data
}

// ─── Users ────────────────────────────────
function supabaseGetAllUsers() {
  return _sup('GET', 'users', { select: 'username', order: 'username' }).then(d => d ? d.map(u => u.username) : [])
}

function supabaseGetUser(username) {
  return _sup('GET', 'users', { select: '*', eq: { username }, single: true })
}

function supabaseUserExists(username) {
  return _sup('GET', 'users', { select: 'id', eq: { username }, single: true }).then(d => !!d)
}

async function supabaseRegister(username, password) {
  const res = await _sup('POST', 'users', { body: { username, password } })
  return res ? null : 'Registration failed'
}

function supabaseLogin(username, password) {
  return _sup('GET', 'users', { select: '*', eq: { username, password }, single: true })
}

async function supabaseUpdateUser(username, updates) {
  const res = await _sup('PATCH', 'users', { eq: { username }, body: updates })
  return !!res
}

async function supabaseDeleteUser(username) {
  await _sup('DELETE', 'users', { eq: { username } })
}

// ─── Posts ────────────────────────────────
function supabaseGetPosts() {
  return _sup('GET', 'posts', { select: '*', order: 'created_at.desc' }).then(d => d || [])
}

async function supabaseCreatePost(post) {
  const data = await _sup('POST', 'posts', { body: post })
  return data && data[0] ? data[0] : null
}

async function supabaseUpdatePost(id, updates) {
  const res = await _sup('PATCH', 'posts', { eq: { id }, body: updates })
  return !!res
}

async function supabaseDeletePost(id) {
  const res = await _sup('DELETE', 'posts', { eq: { id } })
  return !!res
}

// ─── Comments ─────────────────────────────
function supabaseGetComments(postId) {
  return _sup('GET', 'comments', { select: '*', eq: { post_id: postId }, order: 'created_at.asc' }).then(d => d || [])
}

async function supabaseCreateComment(comment) {
  const data = await _sup('POST', 'comments', { body: comment })
  return data && data[0] ? data[0] : null
}

async function supabaseDeleteComment(id) {
  const res = await _sup('DELETE', 'comments', { eq: { id } })
  return !!res
}

async function supabaseUpdateComment(id, updates) {
  const res = await _sup('PATCH', 'comments', { eq: { id }, body: updates })
  return !!res
}

// ─── Playlists ────────────────────────────
function supabaseGetPlaylists(owner) {
  return _sup('GET', 'playlists', { select: '*', eq: { owner }, order: 'created_at.desc' }).then(d => d || [])
}

async function supabaseCreatePlaylist(playlist) {
  const data = await _sup('POST', 'playlists', { body: playlist })
  return data && data[0] ? data[0] : null
}

async function supabaseUpdatePlaylist(id, updates) {
  const res = await _sup('PATCH', 'playlists', { eq: { id }, body: updates })
  return !!res
}

async function supabaseDeletePlaylist(id) {
  const res = await _sup('DELETE', 'playlists', { eq: { id } })
  return !!res
}

// ─── Friends ──────────────────────────────
async function supabaseGetFriends(username) {
  const data = await _sup('GET', 'friends', { select: 'user1,user2', eq: { status: 'accepted' }, or: '(user1.eq.' + username + ',user2.eq.' + username + ')' })
  if (!data) return []
  return data.map(r => r.user1 === username ? r.user2 : r.user1)
}

async function supabaseGetFriendRequests(username) {
  const data = await _sup('GET', 'friends', { select: 'user1', eq: { user2: username, status: 'pending' } })
  if (!data) return []
  return data.map(r => r.user1)
}

async function supabaseGetSentRequests(username) {
  const data = await _sup('GET', 'friends', { select: 'user2', eq: { user1: username, status: 'pending' } })
  if (!data) return []
  return data.map(r => r.user2)
}

async function supabaseSendFriendRequest(user1, user2) {
  const res = await _sup('POST', 'friends', { body: { user1, user2, status: 'pending' } })
  return !!res
}

async function supabaseAcceptFriend(user1, user2) {
  await _sup('PATCH', 'friends', { eq: { user1, user2, status: 'pending' }, body: { status: 'accepted' } })
}

async function supabaseDeclineFriend(user1, user2) {
  await _sup('DELETE', 'friends', { eq: { user1, user2, status: 'pending' } })
}

async function supabaseDeleteFriendRelationship(username, other) {
  await _sup('DELETE', 'friends', { or: 'and(user1.eq.' + username + ',user2.eq.' + other + '),and(user1.eq.' + other + ',user2.eq.' + username + ')' })
}

// ─── Conversations ────────────────────────
function supabaseGetConversation(convId) {
  return _sup('GET', 'conversations', { select: '*', eq: { id: convId }, single: true })
}

async function supabaseSaveConversation(conv) {
  const exists = await supabaseGetConversation(conv.id)
  if (exists) {
    await _sup('PATCH', 'conversations', { eq: { id: conv.id }, body: conv })
  } else {
    await _sup('POST', 'conversations', { body: conv })
  }
}

function supabaseGetMessages(convId) {
  return _sup('GET', 'messages', { select: '*', eq: { conversation_id: convId }, order: 'created_at.asc' }).then(d => d || [])
}

async function supabaseAddMessage(msg) {
  const data = await _sup('POST', 'messages', { body: msg })
  return data && data[0] ? data[0] : null
}

async function supabaseMarkMessagesRead(convId, sender) {
  await _sup('PATCH', 'messages', { eq: { conversation_id: convId, sender, read: false }, body: { read: true } })
}

async function supabaseGetUserConversations(username) {
  const data = await _sup('GET', 'conversations', { select: '*' })
  if (!data) return []
  return data.filter(c => c.members && c.members.includes(username))
}
