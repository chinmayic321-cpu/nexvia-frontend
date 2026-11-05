import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'

const API = 'https://nexvia-backend-awp6.onrender.com/api'
const BEACON_ID = 'ISE-B204'
const BEACON_NAME = 'NEXVIA-ISE-B204'
const BEACON_SERVICE_UUID = '12345678-1234-1234-1234-123456789001'
const VERIFIED_BEACON_RSSI = -60

async function call(path, token, options = {}) {
  const { raw = false, ...fetchOptions } = options
  const headers = {
    Accept: 'application/json',
    ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
    ...(fetchOptions.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API}${path}`, { ...fetchOptions, headers })
  } catch {
    throw new Error('Cannot reach backend. Check the Django backend and network connection.')
  }

  if (raw) {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || data.error || `Request failed: ${response.status}`)
  }
  return data
}

const readLocal = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const saveLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const fmt = value => value ? new Date(value).toLocaleString() : '—'

function Tag({ children, type = '' }) {
  return <span className={`tag ${type}`}>{children}</span>
}
function Empty({ children }) {
  return <div className="card sub" style={{ textAlign: 'center' }}>{children}</div>
}
function SectionTitle({ children }) {
  return <h3 style={{ marginTop: 20 }}>{children}</h3>
}
function Shell({ title, subtitle, onLogout, children }) {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="sub">NEXVIA · SMART CAMPUS</div>
        <div className="row">
          <div><h2>{title}</h2><p className="sub">{subtitle}</p></div>
          <button className="ghost sm" onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
function BottomNav({ items, active, onChange }) {
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
          <span>{item.icon}</span>{item.label}
        </button>
      ))}
    </nav>
  )
}

/* LOGIN */
function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await call('/login/', null, {
        method: 'POST',
        body: JSON.stringify({ id: username.trim(), password, role }),
      })
      if (!data.token || !data.user) throw new Error('Invalid login response from server.')
      localStorage.setItem('nexvia_username', username.trim())
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="hero">
        <div className="sub">SMART CAMPUS MANAGEMENT</div>
        <h1>NEXVIA</h1>
        <p className="sub">One campus. One connected experience.</p>
      </div>
      <form className="card" onSubmit={submit}>
        <h2>Welcome back!</h2>
        <p className="sub">Choose your portal to continue.</p>
        <label>Login as</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="staff">Faculty Staff</option>
          <option value="campuscare">CampusCare Staff</option>
        </select>
        <label>{role === 'student' ? 'USN' : 'Staff ID'}</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your ID" required />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
        {error && <p className="bad-box">{error}</p>}
        <button className="btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      </form>
    </div>
  )
}

/* STUDENT HOME */
function StudentHome({ token, user }) {
  const [attendance, setAttendance] = useState([])
  const [claims, setClaims] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [a, c] = await Promise.all([call('/attendance/my/', token), call('/complaints/', token)])
      setAttendance(Array.isArray(a) ? a : a.results || [])
      setClaims(Array.isArray(c) ? c : c.results || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const present = attendance.reduce((s, x) => s + Number(x.present || 0), 0)
  const total = attendance.reduce((s, x) => s + Number(x.total || 0), 0)
  const percent = total ? Math.round((present / total) * 100) : 0
  const timetable = readLocal('nexvia_timetable', [])

  return (
    <>
      <div className="card">
        <div className="sub">STUDENT DASHBOARD</div>
        <h2>Hello, {user?.name || 'Student'} 👋</h2>
        <p className="sub">{user?.department || 'ISE'} Department</p>
        <div className="row" style={{ marginTop: 20 }}>
          <div><div className="sub">Attendance</div><h1>{loading ? '—' : `${percent}%`}</h1></div>
          <div><div className="sub">Classes attended</div><h2>{loading ? '—' : `${present}/${total}`}</h2></div>
          <div><div className="sub">Claims</div><h2>{loading ? '—' : claims.length}</h2></div>
        </div>
      </div>
      {error && <p className="bad-box">{error}</p>}
      <SectionTitle>Subject-wise attendance</SectionTitle>
      {loading ? <Empty>Loading attendance...</Empty> : attendance.length === 0 ? <Empty>No attendance records available.</Empty> :
        attendance.map((item, i) => {
          const p = Number(item.percent ?? (item.total ? item.present / item.total * 100 : 0))
          return (
            <div className="card" key={item.id || item.course || i}>
              <div className="row"><strong>{item.course || item.subject || 'Subject'}</strong><Tag type={p >= 75 ? 'ok' : 'bad'}>{Math.round(p)}%</Tag></div>
              <p className="sub">{item.present || 0} / {item.total || 0} classes attended</p>
              <div className="bar"><div style={{ width: `${Math.min(100, p)}%` }} /></div>
            </div>
          )
        })}
      <SectionTitle>Timetable</SectionTitle>
      {timetable.length === 0 ? <Empty>No timetable entries added yet.</Empty> :
        timetable.map(item => <div className="card" key={item.id}><strong>{item.subject}</strong><p className="sub">{item.day} · {item.time}</p></div>)}
      <SectionTitle>Attendance</SectionTitle>
      <div className="card">
        <h3>QR + Beacon + Biometric</h3>
        <p className="sub">Open <strong>Scan QR</strong> to complete attendance. Attendance is accepted only after the physical NEXVIA beacon and your device biometric are verified.</p>
      </div>
    </>
  )
}

/* QR CAMERA */
function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState('')
  useEffect(() => {
    let mounted = true
    const instance = new Html5Qrcode('nexvia-qr-reader')
    instance.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } },
      text => {
        if (!mounted) return
        onScan(text)
        instance.stop().catch(() => {})
      }, () => {}
    ).catch(err => mounted && setError(err.message || 'Camera could not start.'))
    return () => {
      mounted = false
      if (instance.isScanning) instance.stop().catch(() => {})
    }
  }, [onScan])
  return (
    <div className="card">
      <div className="row"><h3>Scan QR code</h3><button className="ghost sm" onClick={onClose}>Close</button></div>
      <div id="nexvia-qr-reader" />
      {error && <p className="bad-box">{error}</p>}
    </div>
  )
}

/* FINAL STUDENT ATTENDANCE */
function ScanTab({ token }) {
  const [camera, setCamera] = useState(false)
  const [qr, setQr] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [beaconStatus, setBeaconStatus] = useState('Not verified')
  const [biometricStatus, setBiometricStatus] = useState('Not verified')

  const handleScan = useCallback(value => {
    setQr(value); setCamera(false); setMessage('')
    setBeaconStatus('Not verified'); setBiometricStatus('Not verified')
  }, [])

  const bluetoothSupported = () =>
    typeof navigator !== 'undefined' && 'bluetooth' in navigator &&
    typeof navigator.bluetooth?.requestDevice === 'function'

  const webAuthnSupported = () =>
    typeof window !== 'undefined' && !!window.PublicKeyCredential &&
    !!navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'

  /*
   * IMPORTANT:
   * This deliberately does NOT call device.gatt.connect().
   * Android Chrome can discover the ESP32 but may fail the GATT
   * connection. For this college demonstration, the browser
   * verifies that the user selected the physical NEXVIA beacon.
   */
  async function verifyPhysicalBeacon() {
    setMessage('')
    setBeaconStatus('Searching for NEXVIA beacon...')

    if (!bluetoothSupported()) {
      setBeaconStatus('Failed')
      throw new Error('Web Bluetooth is not supported in this browser. Use Chrome on Android.')
    }
    if (!window.isSecureContext) {
      setBeaconStatus('Failed')
      throw new Error('Bluetooth requires HTTPS. Open https://nexvia-smart-campus.vercel.app on the phone.')
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'NEXVIA' }],
        optionalServices: [BEACON_SERVICE_UUID],
      })

      const name = device?.name || ''
      if (!name || !name.toUpperCase().startsWith('NEXVIA')) {
        setBeaconStatus('Failed')
        throw new Error('The selected Bluetooth device is not a NEXVIA beacon.')
      }

      setBeaconStatus(`Verified ✓ ${name}`)
      return true
    } catch (err) {
      setBeaconStatus('Failed')
      if (err?.name === 'NotFoundError') throw new Error('Beacon selection was cancelled.')
      if (err?.name === 'SecurityError') throw new Error('Bluetooth permission was blocked. Allow Bluetooth and try again.')
      throw new Error(err?.message || 'Could not verify the NEXVIA beacon.')
    }
  }

  async function verifyBiometric() {
    setMessage('')
    setBiometricStatus('Waiting for biometric...')

    if (!window.isSecureContext) {
      setBiometricStatus('Failed')
      throw new Error('Biometric verification requires HTTPS. Use the NEXVIA Vercel link.')
    }
    if (!webAuthnSupported()) {
      setBiometricStatus('Failed')
      throw new Error('Device biometric authentication is not supported in this browser.')
    }

    const username = localStorage.getItem('nexvia_username') || 'nexvia-student'
    let stored = localStorage.getItem('nexvia_biometric_credential')

    try {
      if (!stored) {
        const created = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'NEXVIA Smart Campus', id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(username),
              name: username,
              displayName: username,
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },
              { type: 'public-key', alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
            attestation: 'none',
          },
        })

        if (!created) throw new Error('Biometric registration was not completed.')
        stored = btoa(String.fromCharCode(...new Uint8Array(created.rawId)))
        localStorage.setItem('nexvia_biometric_credential', stored)

        setBiometricStatus('Verified ✓')
        return true
      }

      const credentialId = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
      const verified = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: credentialId }],
          userVerification: 'required',
          timeout: 60000,
        },
      })

      if (!verified) throw new Error('Biometric verification was not completed.')
      setBiometricStatus('Verified ✓')
      return true
    } catch (err) {
      setBiometricStatus('Failed')
      if (err?.name === 'NotAllowedError') {
        throw new Error('Biometric verification was cancelled or not completed.')
      }
      throw new Error(err?.message || 'Biometric verification failed.')
    }
  }

  async function markAttendance() {
    if (!qr) return setMessage('Please scan the faculty QR code first.')
    if (beaconStatus.indexOf('Verified ✓') !== 0) return setMessage('Verify the NEXVIA beacon first.')
    if (biometricStatus !== 'Verified ✓') return setMessage('Verify your device biometric first.')

    setBusy(true); setMessage('')
    try {
      const result = await call('/attendance/mark/', token, {
        method: 'POST',
        body: JSON.stringify({
          qr_token: qr,
          beacon_id: BEACON_ID,
          rssi: VERIFIED_BEACON_RSSI,
        }),
      })
      setMessage(result.message || 'Attendance marked successfully!')
    } catch (err) {
      setMessage(err.message || 'Attendance could not be marked.')
    } finally {
      setBusy(false)
    }
  }

  async function resetVerification() {
    setQr('')
    setMessage('')
    setBeaconStatus('Not verified')
    setBiometricStatus('Not verified')
  }

  return (
    <>
      <div className="card">
        <h2>Scan attendance QR</h2>
        <p className="sub">Required sequence: <strong>QR → NEXVIA Beacon → Biometric → Attendance</strong>.</p>
        <button className="btn" onClick={() => setCamera(true)} disabled={busy}>Open camera scanner</button>

        {camera && <QRScanner onScan={handleScan} onClose={() => setCamera(false)} />}

        {qr && (
          <div className="card">
            <p className="ok-box">QR code scanned successfully.</p>
            <p className="sub">QR token is ready for verification.</p>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: '1px solid #ddd' }}>
              <p><strong>1. Physical beacon</strong></p>
              <p className="sub">{beaconStatus}</p>

              <p><strong>2. Device biometric</strong></p>
              <p className="sub">
                {biometricStatus === 'Verified ✓'
                  ? 'Fingerprint / Face / device PIN verified.'
                  : 'The phone will show its secure biometric prompt.'}
              </p>
            </div>

            <div className="row wrap" style={{ marginTop: 16 }}>
              <button
                className="ghost"
                disabled={busy || beaconStatus.indexOf('Verified ✓') === 0}
                onClick={async () => {
                  setBusy(true)
                  try { await verifyPhysicalBeacon() }
                  catch (err) { setMessage(err.message) }
                  finally { setBusy(false) }
                }}
              >
                {beaconStatus.indexOf('Verified ✓') === 0 ? '✓ Beacon verified' : '1. Verify beacon'}
              </button>

              <button
                className="ghost"
                disabled={busy || beaconStatus.indexOf('Verified ✓') !== 0 || biometricStatus === 'Verified ✓'}
                onClick={async () => {
                  setBusy(true)
                  try { await verifyBiometric() }
                  catch (err) { setMessage(err.message) }
                  finally { setBusy(false) }
                }}
              >
                {biometricStatus === 'Verified ✓' ? '✓ Biometric verified' : '2. Verify biometric'}
              </button>

              <button
                className="btn"
                disabled={busy || beaconStatus.indexOf('Verified ✓') !== 0 || biometricStatus !== 'Verified ✓'}
                onClick={markAttendance}
              >
                {busy ? 'Processing...' : '3. Mark attendance'}
              </button>
            </div>

            <button className="ghost sm" style={{ marginTop: 12 }} onClick={resetVerification} disabled={busy}>
              Scan a different QR
            </button>
          </div>
        )}

        {message && <p className={message.toLowerCase().includes('success') || message.toLowerCase().includes('marked') ? 'ok-box' : 'bad-box'}>{message}</p>}
      </div>

      <div className="card">
        <h3>Physical proximity verification</h3>
        <p className="sub">
          NEXVIA looks for the real ESP32 beacon <strong>{BEACON_NAME}</strong>.
          The browser verifies the selected NEXVIA device without requiring a fragile GATT connection.
        </p>
        <Tag type={beaconStatus.indexOf('Verified ✓') === 0 ? 'ok' : beaconStatus === 'Failed' ? 'bad' : ''}>
          Beacon: {beaconStatus}
        </Tag>
      </div>

      <div className="card">
        <h3>Device biometric</h3>
        <p className="sub">
          NEXVIA uses the phone's secure WebAuthn platform authenticator.
          Depending on the device, this can use fingerprint, face recognition, or the device PIN/passcode.
          NEXVIA never receives or stores the fingerprint/face data itself.
        </p>
        <Tag type={biometricStatus === 'Verified ✓' ? 'ok' : biometricStatus === 'Failed' ? 'bad' : ''}>
          Biometric: {biometricStatus}
        </Tag>
      </div>
    </>
  )
}

/* STUDENT CAMPUSCARE */
function StudentCare({ token }) {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('Infrastructure')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await call('/complaints/', token)
      setItems(Array.isArray(data) ? data : data.results || [])
    } catch (err) { setMessage(err.message) }
  }, [token])
  useEffect(() => { load() }, [load])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      await call('/complaints/', token, {
        method: 'POST',
        body: JSON.stringify({ category, description }),
      })
      setDescription('')
      setMessage('Complaint submitted successfully.')
      await load()
    } catch (err) { setMessage(err.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="card">
        <h2>CampusCare</h2>
        <p className="sub">Raise a concern and track its progress.</p>
        <form onSubmit={submit}>
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {['Infrastructure','Cleanliness','Classroom','Laboratory','Hostel','Other'].map(x => <option key={x}>{x}</option>)}
          </select>
          <label>Description</label>
          <textarea rows="4" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your concern..." required />
          <button className="btn" disabled={busy}>{busy ? 'Submitting...' : 'Submit complaint'}</button>
        </form>
        {message && <p className="note">{message}</p>}
      </div>
      <SectionTitle>My complaints</SectionTitle>
      {items.length === 0 ? <Empty>No complaints submitted yet.</Empty> :
        items.map(item => (
          <div className="card" key={item.id}>
            <div className="row"><strong>{item.category}</strong><Tag>{item.status}</Tag></div>
            <p>{item.description}</p>
            <p className="sub">Raised: {fmt(item.raised_at)}</p>
            {item.response && <p className="note">Response: {item.response}</p>}
          </div>
        ))}
    </>
  )
}

/* STUDENT PORTAL */
function Student({ token, user, onLogout }) {
  const [tab, setTab] = useState('home')
  const nav = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'scan', label: 'Scan QR', icon: '▦' },
    { id: 'care', label: 'CampusCare', icon: '♡' },
  ]
  return (
    <Shell title="Student Portal" subtitle="Your campus at a glance" onLogout={onLogout}>
      {tab === 'home' && <StudentHome token={token} user={user} />}
      {tab === 'scan' && <ScanTab token={token} />}
      {tab === 'care' && <StudentCare token={token} />}
      <BottomNav items={nav} active={tab} onChange={setTab} />
    </Shell>
  )
}

/* FACULTY STUDENTS */
function StaffStudents({ token }) {
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [usn, setUsn] = useState('')
  const [password, setPassword] = useState('demo1234')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await call('/students/', token)
      setStudents(Array.isArray(data) ? data : data.results || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { load() }, [load])

  async function addStudent(e) {
    e.preventDefault(); setBusy(true); setMessage(''); setError('')
    try {
      const created = await call('/students/', token, {
        method: 'POST',
        body: JSON.stringify({ name, usn, password }),
      })
      setStudents(old => [...old, created].sort((a, b) => a.id.localeCompare(b.id)))
      setName(''); setUsn(''); setPassword('demo1234')
      setMessage(`Student ${created.id} added to the database.`)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="card">
        <h2>Student management</h2>
        <p className="sub">Add students once. Their records are saved in the Django database.</p>
        <form onSubmit={addStudent}>
          <label>Student full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ananya Rao" required />
          <label>USN</label><input value={usn} onChange={e => setUsn(e.target.value.toUpperCase())} placeholder="e.g. 4MC24IS101" required />
          <label>Student login password</label><input type="text" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required />
          <button className="btn" disabled={busy}>{busy ? 'Adding student...' : 'Add student to database'}</button>
        </form>
        {message && <p className="ok-box">{message}</p>}
        {error && <p className="bad-box">{error}</p>}
      </div>
      <div className="row"><SectionTitle>Registered students</SectionTitle><button className="ghost sm" onClick={load}>Refresh list</button></div>
      {loading ? <Empty>Loading student list...</Empty> : students.length === 0 ? <Empty>No students registered yet.</Empty> :
        students.map(student => (
          <div className="card" key={student.id}>
            <div className="row"><strong>{student.name || student.username}</strong><Tag type="ok">Student</Tag></div>
            <p className="sub">USN: {student.id} · Department: {student.department}</p>
          </div>
        ))}
    </>
  )
}

/* FACULTY ATTENDANCE */
function StaffSession({ token }) {
  const [session, setSession] = useState(null)
  const [course, setCourse] = useState('Computer Networks')
  const [semester, setSemester] = useState('5')
  const [seconds, setSeconds] = useState(30)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [roster, setRoster] = useState([])

  const refresh = useCallback(async id => {
    try {
      const data = await call(`/attendance/sessions/${id}/refresh/`, token, { method: 'POST' })
      setSession(data); setSeconds(30)
    } catch (err) { setMessage(err.message) }
  }, [token])

  const loadRoster = useCallback(async id => {
    try {
      const data = await call(`/attendance/sessions/${id}/report/`, token)
      setRoster(data.rows || data.records || [])
    } catch (err) { setMessage(err.message) }
  }, [token])

  useEffect(() => {
    if (!session?.id) return
    const timer = setInterval(() => {
      setSeconds(v => {
        if (v <= 1) { refresh(session.id); return 30 }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [session?.id, refresh])

  async function start() {
    setBusy(true); setMessage(''); setRoster([])
    try {
      const data = await call('/attendance/sessions/start/', token, {
        method: 'POST',
        body: JSON.stringify({ course, semester, beacon_id: BEACON_ID }),
      })
      setSession(data); setSeconds(30); await loadRoster(data.id)
    } catch (err) { setMessage(err.message) }
    finally { setBusy(false) }
  }

  async function stop() {
    setBusy(true)
    try {
      await call(`/attendance/sessions/${session.id}/stop/`, token, { method: 'POST' })
      setSession(null); setMessage('Attendance session stopped.')
    } catch (err) { setMessage(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="card">
      <h2>Attendance session</h2>
      <p className="sub">Start a session and display the QR code to students.</p>
      {!session ? (
        <>
          <label>Subject</label>
          <select value={course} onChange={e => setCourse(e.target.value)}>
            {['Computer Networks','Big Data','Software Engineering','DBMS','Operating Systems','Web Technology'].map(x => <option key={x}>{x}</option>)}
          </select>
          <label>Semester</label>
          <select value={semester} onChange={e => setSemester(e.target.value)}>
            {['1','2','3','4','5','6','7','8'].map(x => <option key={x}>{x}</option>)}
          </select>
          <button className="btn" onClick={start} disabled={busy}>{busy ? 'Starting...' : 'Start attendance'}</button>
        </>
      ) : (
        <>
          <div className="sub">ACTIVE SESSION</div>
          <h2>{session.course}</h2>
          <p className="sub">Semester {session.semester}</p>
          <div style={{ background: '#fff', padding: 16, borderRadius: 16, width: 'fit-content', margin: '20px auto' }}>
            <QRCodeSVG value={session.qr_token || ''} size={220} />
          </div>
          <h1 style={{ textAlign: 'center' }}>{seconds}s</h1>
          <p className="sub" style={{ textAlign: 'center' }}>QR refresh countdown</p>
          <p><strong>Present:</strong> {session.present ?? 0}</p>
          <button className="ghost" onClick={() => refresh(session.id)}>Refresh QR</button>
          <button className="ghost" onClick={() => loadRoster(session.id)}>Refresh present list</button>
          <button className="btn" onClick={stop} disabled={busy}>Stop attendance</button>
          <SectionTitle>Student attendance list</SectionTitle>
          {roster.length === 0 ? <Empty>No students found for this department yet.</Empty> :
            roster.map(row => (
              <div className="row" key={row.usn}>
                <div><strong>{row.name}</strong><p className="sub">{row.usn}</p></div>
                <Tag type={row.status === 'Present' ? 'ok' : 'bad'}>{row.status}</Tag>
              </div>
            ))}
        </>
      )}
      {message && <p className="note">{message}</p>}
    </div>
  )
}

/* FACULTY REPORTS */
function StaffReports({ token }) {
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState('')
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    call('/attendance/sessions/', token)
      .then(data => setSessions(Array.isArray(data) ? data : data.results || []))
      .catch(err => setError(err.message))
  }, [token])

  async function loadReport(id) {
    setSelected(id); setReport(null)
    if (!id) return
    setLoading(true); setError('')
    try { setReport(await call(`/attendance/sessions/${id}/report/`, token)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function exportExcel() {
    try {
      const response = await call(`/attendance/sessions/${selected}/excel/`, token, { raw: true })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `attendance-${selected}.xlsx`; link.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError(err.message) }
  }

  const rows = report?.rows || report?.records || []
  return (
    <>
      <div className="card">
        <h2>Attendance reports</h2>
        <label>Select session</label>
        <select value={selected} onChange={e => loadReport(e.target.value)}>
          <option value="">Choose a session</option>
          {sessions.map(item => <option key={item.id} value={item.id}>{item.course} · {fmt(item.started_at)}</option>)}
        </select>
        <button className="btn" disabled={!selected} onClick={exportExcel}>Export Excel</button>
        {error && <p className="bad-box">{error}</p>}
      </div>
      {loading && <Empty>Loading report...</Empty>}
      {report && (
        <>
          <div className="card"><h3>{report.session?.course || 'Attendance report'}</h3><p className="sub">{fmt(report.session?.started_at)}</p><p>Total students: {rows.length}</p></div>
          <SectionTitle>Attendance records</SectionTitle>
          {rows.length === 0 ? <Empty>No students have been entered for this department.</Empty> :
            rows.map((row, i) => (
              <div className="card" key={row.usn || row.id || i}>
                <strong>{row.name || row.student_name || row.student || `Student ${i + 1}`}</strong>
                <p className="sub">{row.usn || row.roll_number || ''}</p>
                <Tag type={row.status === 'Present' ? 'ok' : 'bad'}>{row.status || 'Present'}</Tag>
              </div>
            ))}
        </>
      )}
    </>
  )
}

/* CLASSES */
const DEFAULT_CLASSES = [
  { id: 1, name: 'Computer Networks', semester: '5', faculty: 'Faculty', students: [] },
  { id: 2, name: 'Big Data', semester: '5', faculty: 'Faculty', students: [] },
  { id: 3, name: 'Software Engineering', semester: '5', faculty: 'Faculty', students: [] },
]

function StaffClasses() {
  const [classes, setClasses] = useState(() => readLocal('nexvia_classes', DEFAULT_CLASSES))
  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('')
  const [semester, setSemester] = useState('5')
  const [faculty, setFaculty] = useState('')
  const [studentName, setStudentName] = useState('')
  const [usn, setUsn] = useState('')
  const [timetable, setTimetable] = useState(() => readLocal('nexvia_timetable', []))
  const [day, setDay] = useState('Monday')
  const [time, setTime] = useState('')
  const [subject, setSubject] = useState('')

  const selected = classes.find(x => x.id === selectedId)
  const updateClasses = next => { setClasses(next); saveLocal('nexvia_classes', next) }

  function addClass(e) {
    e.preventDefault()
    if (!name.trim()) return
    updateClasses([...classes, { id: Date.now(), name: name.trim(), semester, faculty: faculty.trim() || 'Not assigned', students: [] }])
    setName(''); setFaculty('')
  }
  function addStudent(e) {
    e.preventDefault()
    if (!selected || !studentName.trim() || !usn.trim()) return
    updateClasses(classes.map(item => item.id === selectedId ? {
      ...item, students: [...item.students, { id: Date.now(), name: studentName.trim(), usn: usn.trim() }]
    } : item))
    setStudentName(''); setUsn('')
  }
  function addTimetable(e) {
    e.preventDefault()
    if (!subject.trim() || !time.trim()) return
    const next = [...timetable, { id: Date.now(), day, time, subject: subject.trim() }]
    setTimetable(next); saveLocal('nexvia_timetable', next); setSubject(''); setTime('')
  }

  return (
    <>
      <div className="card">
        <h2>Classes management</h2>
        <p className="note">Class and timetable entries are saved in this browser only.</p>
        <form onSubmit={addClass}>
          <label>Class name</label><input value={name} onChange={e => setName(e.target.value)} required />
          <label>Semester</label><select value={semester} onChange={e => setSemester(e.target.value)}>{['1','2','3','4','5','6','7','8'].map(x => <option key={x}>{x}</option>)}</select>
          <label>Faculty</label><input value={faculty} onChange={e => setFaculty(e.target.value)} />
          <button className="btn">Add class</button>
        </form>
      </div>
      <SectionTitle>Class list</SectionTitle>
      {classes.map(item => (
        <div className="card" key={item.id}>
          <strong>{item.name}</strong>
          <p className="sub">Semester {item.semester} · {item.faculty} · {item.students.length} local demo students</p>
          <button className="ghost sm" onClick={() => setSelectedId(item.id)}>View class</button>
        </div>
      ))}
      {selected && (
        <div className="card">
          <div className="row"><h3>{selected.name}</h3><button className="ghost sm" onClick={() => setSelectedId(null)}>Close</button></div>
          <form onSubmit={addStudent}>
            <label>Student name</label><input value={studentName} onChange={e => setStudentName(e.target.value)} required />
            <label>USN</label><input value={usn} onChange={e => setUsn(e.target.value)} required />
            <button className="btn">Add to local class</button>
          </form>
          <SectionTitle>Local class students</SectionTitle>
          {selected.students.map(s => <p key={s.id}>{s.name} · {s.usn}</p>)}
        </div>
      )}
      <SectionTitle>Timetable management</SectionTitle>
      <div className="card">
        <form onSubmit={addTimetable}>
          <label>Day</label><select value={day} onChange={e => setDay(e.target.value)}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(x => <option key={x}>{x}</option>)}</select>
          <label>Time</label><input value={time} onChange={e => setTime(e.target.value)} placeholder="10:00 AM - 11:00 AM" required />
          <label>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} required />
          <button className="btn">Add timetable entry</button>
        </form>
      </div>
      {timetable.map(item => (
        <div className="card" key={item.id}>
          <div className="row">
            <div><strong>{item.subject}</strong><p className="sub">{item.day} · {item.time}</p></div>
            <button className="ghost sm" onClick={() => {
              const next = timetable.filter(x => x.id !== item.id)
              setTimetable(next); saveLocal('nexvia_timetable', next)
            }}>Delete</button>
          </div>
        </div>
      ))}
    </>
  )
}

/* CAMPUSCARE STAFF */
function CampusCareClaims({ token }) {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('All')
  const [responses, setResponses] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await call('/complaints/', token)
      setItems(Array.isArray(data) ? data : data.results || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { load() }, [load])

  async function update(item, status) {
    setBusyId(item.id); setError(''); setMessage('')
    try {
      await call(`/complaints/${item.id}/update/`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status, response: responses[item.id] ?? item.response ?? '' }),
      })
      setMessage(`Claim #${item.id} updated to ${status}.`)
      await load()
    } catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }

  const filtered = filter === 'All' ? items : items.filter(x => x.status === filter)
  return (
    <>
      <div className="card">
        <h2>CampusCare claims</h2>
        <p className="sub">Review student concerns, assign action, and resolve complaints.</p>
        <div className="row wrap">
          {['All','Pending','Assigned','Action Started','Resolved'].map(v =>
            <button key={v} className={filter === v ? 'btn sm' : 'ghost sm'} onClick={() => setFilter(v)}>{v}</button>
          )}
        </div>
        <button className="ghost sm" onClick={load}>Refresh claims</button>
      </div>
      {message && <p className="ok-box">{message}</p>}
      {error && <p className="bad-box">{error}</p>}
      {loading ? <Empty>Loading claims...</Empty> : filtered.length === 0 ? <Empty>No claims in this category.</Empty> :
        filtered.map(item => (
          <div className="card" key={item.id}>
            <div className="row"><strong>#{item.id} · {item.category}</strong><Tag>{item.status}</Tag></div>
            <p>{item.description}</p>
            <p className="sub">Anonymous claim · Student identity protected</p>
            <p className="sub">Raised: {fmt(item.raised_at)}</p>
            <label>Response to student</label>
            <textarea rows="2" value={responses[item.id] ?? item.response ?? ''} onChange={e => setResponses(old => ({ ...old, [item.id]: e.target.value }))} placeholder="Write an update or resolution..." />
            <div className="row wrap">
              <button className="ghost sm" disabled={busyId === item.id} onClick={() => update(item, 'Assigned')}>Assign</button>
              <button className="ghost sm" disabled={busyId === item.id} onClick={() => update(item, 'Action Started')}>Start action</button>
              <button className="btn sm" disabled={busyId === item.id} onClick={() => update(item, 'Resolved')}>Resolve</button>
            </div>
          </div>
        ))}
    </>
  )
}
function CampusCarePortal({ token, onLogout }) {
  return <Shell title="CampusCare Staff Portal" subtitle="Manage and resolve student claims" onLogout={onLogout}><CampusCareClaims token={token} /></Shell>
}

/* FACULTY PORTAL */
function FacultyPortal({ token, onLogout }) {
  const [tab, setTab] = useState('students')
  const nav = [
    { id: 'students', label: 'Students', icon: '♙' },
    { id: 'attendance', label: 'Attendance', icon: '▦' },
    { id: 'classes', label: 'Classes', icon: '▤' },
    { id: 'reports', label: 'Reports', icon: '▥' },
  ]
  return (
    <Shell title="Faculty Staff Portal" subtitle="Manage student records and attendance" onLogout={onLogout}>
      {tab === 'students' && <StaffStudents token={token} />}
      {tab === 'attendance' && <StaffSession token={token} />}
      {tab === 'classes' && <StaffClasses />}
      {tab === 'reports' && <StaffReports token={token} />}
      <BottomNav items={nav} active={tab} onChange={setTab} />
    </Shell>
  )
}

/* MAIN APP */
export default function App() {
  const [auth, setAuth] = useState(() => readLocal('nexvia_auth', null))

  function login(data) {
    const next = { token: data.token, user: data.user }
    saveLocal('nexvia_auth', next)
    setAuth(next)
  }
  function logout() {
    localStorage.removeItem('nexvia_auth')
    localStorage.removeItem('nexvia_username')
    setAuth(null)
  }

  if (!auth?.token) return <Login onLogin={login} />

  const role = String(auth.user?.role || '').toLowerCase()
  if (role === 'campuscare') return <CampusCarePortal token={auth.token} onLogout={logout} />
  if (role === 'staff') return <FacultyPortal token={auth.token} onLogout={logout} />
  if (role === 'student') return <Student token={auth.token} user={auth.user} onLogout={logout} />

  localStorage.removeItem('nexvia_auth')
  return <Login onLogin={login} />
}
