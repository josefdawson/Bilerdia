const SUPABASE_URL = 'https://xhotvaezckemrjzozzal.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhob3R2YWV6Y2tlbXJqem96emFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODk1ODgsImV4cCI6MjA5NzM2NTU4OH0.kREPEfPMufXOPMT5UzqQcP0YJgHBRMRnwiDFpItWrTs'

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let loggedInUser = new URLSearchParams(window.location.search).get('user') || ''

// ─── Users ────────────────────────────────
async function supabaseGetAllUsers() {
  const { data } = await _supabase.from('users').select('username').order('username')
  return data ? data.map(u => u.username) : []
}

async function supabaseGetUser(username) {
  const { data } = await _supabase.from('users').select('*').eq('username', username).maybeSingle()
  return data || null
}

async function supabaseUserExists(username) {
  const { data } = await _supabase.from('users').select('id').eq('username', username).maybeSingle()
  return !!data
}

async function supabaseRegister(username, password) {
  const { error } = await _supabase.from('users').insert({ username, password })
  return error ? error.message : null
}

async function supabaseLogin(username, password) {
  const { data } = await _supabase.from('users').select('*').eq('username', username).eq('password', password).maybeSingle()
  return data || null
}

async function supabaseUpdateUser(username, updates) {
  const { error } = await _supabase.from('users').update(updates).eq('username', username)
  return !error
}

async function supabaseDeleteUser(username) {
  await _supabase.from('users').delete().eq('username', username)
}

// ─── Posts ────────────────────────────────
async function supabaseGetPosts() {
  const { data } = await _supabase.from('posts').select('*').order('created_at', { ascending: false })
  return data || []
}

async function supabaseCreatePost(post) {
  const { data, error } = await _supabase.from('posts').insert(post).select()
  return error ? null : (data ? data[0] : null)
}

async function supabaseUpdatePost(id, updates) {
  const { error } = await _supabase.from('posts').update(updates).eq('id', id)
  return !error
}

async function supabaseDeletePost(id) {
  const { error } = await _supabase.from('posts').delete().eq('id', id)
  return !error
}

// ─── Comments ─────────────────────────────
async function supabaseGetComments(postId) {
  const { data } = await _supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
  return data || []
}

async function supabaseCreateComment(comment) {
  const { error } = await _supabase.from('comments').insert(comment)
  return !error
}

async function supabaseDeleteComment(id) {
  const { error } = await _supabase.from('comments').delete().eq('id', id)
  return !error
}

async function supabaseUpdateComment(id, updates) {
  const { error } = await _supabase.from('comments').update(updates).eq('id', id)
  return !error
}

// ─── Playlists ────────────────────────────
async function supabaseGetPlaylists(owner) {
  const { data } = await _supabase.from('playlists').select('*').eq('owner', owner).order('created_at', { ascending: false })
  return data || []
}

async function supabaseCreatePlaylist(playlist) {
  const { data, error } = await _supabase.from('playlists').insert(playlist).select()
  return error ? null : (data ? data[0] : null)
}

async function supabaseUpdatePlaylist(id, updates) {
  const { error } = await _supabase.from('playlists').update(updates).eq('id', id)
  return !error
}

async function supabaseDeletePlaylist(id) {
  const { error } = await _supabase.from('playlists').delete().eq('id', id)
  return !error
}

// ─── Friends ──────────────────────────────
async function supabaseGetFriends(username) {
  const { data } = await _supabase.from('friends').select('user1, user2')
    .or('user1.eq.' + username + ',user2.eq.' + username)
    .eq('status', 'accepted')
  if (!data) return []
  return data.map(r => r.user1 === username ? r.user2 : r.user1)
}

async function supabaseGetFriendRequests(username) {
  const { data } = await _supabase.from('friends').select('user1')
    .eq('user2', username).eq('status', 'pending')
  return data ? data.map(r => r.user1) : []
}

async function supabaseGetSentRequests(username) {
  const { data } = await _supabase.from('friends').select('user2')
    .eq('user1', username).eq('status', 'pending')
  return data ? data.map(r => r.user2) : []
}

async function supabaseSendFriendRequest(user1, user2) {
  const { error } = await _supabase.from('friends').insert({ user1, user2, status: 'pending' })
  return !error
}

async function supabaseAcceptFriend(user1, user2) {
  await _supabase.from('friends').update({ status: 'accepted' })
    .eq('user1', user1).eq('user2', user2).eq('status', 'pending')
}

async function supabaseDeclineFriend(user1, user2) {
  await _supabase.from('friends').delete()
    .eq('user1', user1).eq('user2', user2).eq('status', 'pending')
}

async function supabaseDeleteFriendRelationship(username, other) {
  await _supabase.from('friends').delete()
    .or('and(user1.eq.' + username + ',user2.eq.' + other + '),and(user1.eq.' + other + ',user2.eq.' + username + ')')
}

// ─── Conversations ────────────────────────
async function supabaseGetConversation(convId) {
  const { data } = await _supabase.from('conversations').select('*').eq('id', convId).maybeSingle()
  return data || null
}

async function supabaseSaveConversation(conv) {
  const exists = await supabaseGetConversation(conv.id)
  if (exists) {
    await _supabase.from('conversations').update(conv).eq('id', conv.id)
  } else {
    await _supabase.from('conversations').insert(conv)
  }
}

async function supabaseGetMessages(convId) {
  const { data } = await _supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
  return data || []
}

async function supabaseAddMessage(msg) {
  const { error } = await _supabase.from('messages').insert(msg)
  return !error
}

async function supabaseMarkMessagesRead(convId, sender) {
  await _supabase.from('messages').update({ read: true })
    .eq('conversation_id', convId).eq('sender', sender).eq('read', false)
}

// Get all conversations a user is a member of
async function supabaseGetUserConversations(username) {
  const { data } = await _supabase.from('conversations').select('*')
  if (!data) return []
  return data.filter(c => (c.members || []).includes(username))
}
