import { useEffect, useState } from 'react'
import { Save, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ProfilePage() {
  const { session, user, updateUserProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name)
    setPhone(user.phone ?? '')
    setAvatarUrl(user.avatar_url ?? '')
  }, [user])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('id', user.id)
      .select('full_name, phone, avatar_url')
      .single()

    setSaving(false)

    if (error) {
      setErrorMessage(`Could not save your profile: ${error.message}`)
      return
    }

    updateUserProfile(data)
    setMessage('Your profile has been saved.')
  }

  if (!user) {
    return <p className="text-sm text-red-600">Could not load your profile. Please sign out and sign in again.</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <UserRound size={24} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Update your personal information.</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-20 w-20 rounded-full border border-gray-200 object-cover"
          />
        )}

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Full name</span>
          <input
            className="input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            maxLength={100}
            autoComplete="name"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Phone number</span>
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={30}
            autoComplete="tel"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Avatar image URL</span>
          <input
            className="input"
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://example.com/photo.jpg"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            className="input bg-gray-50"
            type="email"
            value={session?.user.email ?? ''}
            readOnly
          />
          <span className="text-xs text-gray-500">To change your email, use the account email-change process.</span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Account role</span>
          <input
            className="input bg-gray-50"
            value={user.role.replace('_', ' ')}
            readOnly
          />
        </label>

        {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}