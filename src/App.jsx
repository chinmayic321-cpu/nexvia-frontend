import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'

// =====================================================
// NEXVIA CONFIGURATION
// =====================================================

const API = 'https://nexvia-backend-awp6.onrender.com/api'

const BEACON_ID = 'ISE-B204'
const BEACON_NAME = 'NEXVIA-ISE-B204'
const BEACON_SERVICE_UUID =
  '12345678-1234-1234-1234-123456789001'

const RSSI_LIMIT = -75

// =====================================================
// API HELPER
// =====================================================

async function call(path, token, options = {}) {
  const { raw = false, ...fetchOptions } = options

  const headers = {
    Accept: 'application/json',
    ...(fetchOptions.body
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(fetchOptions.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(`${API}${path}`, {
      ...fetchOptions,
      headers,
    })
  } catch (err) {
    console.error('NEXVIA API request failed:', err)

    throw new Error(
      `Cannot reach backend: ${
        err?.message || 'Unknown browser fetch error'
      }`
    )
  }

  if (raw) {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return response
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.error ||
        `Request failed: ${response.status}`
    )
  }

  return data
}

// =====================================================
// LOCAL STORAGE HELPERS
// =====================================================

const readLocal = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

const saveLocal = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value))

const fmt = value =>
  value ? new Date(value).toLocaleString() : '—'

// =====================================================
// BASIC UI COMPONENTS
// =====================================================

function Tag({ children, type = '' }) {
  return (
    <span className={`tag ${type}`}>
      {children}
    </span>
  )
}

function Empty({ children }) {
  return (
    <div
      className="card sub"
      style={{ textAlign: 'center' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ marginTop: 20 }}>
      {children}
    </h3>
  )
}

function Shell({
  title,
  subtitle,
  onLogout,
  children,
}) {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="sub">
          NEXVIA · SMART CAMPUS
        </div>

        <div className="row">
          <div>
            <h2>{title}</h2>

            <p className="sub">
              {subtitle}
            </p>
          </div>

          <button
            className="ghost sm"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  )
}

function BottomNav({
  items,
  active,
  onChange,
}) {
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={
            active === item.id
              ? 'active'
              : ''
          }
          onClick={() =>
            onChange(item.id)
          }
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

// =====================================================
// LOGIN
// =====================================================

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      const data = await call(
        '/login/',
        null,
        {
          method: 'POST',

          body: JSON.stringify({
            id: username.trim(),
            password,
            role,
          }),
        }
      )

      if (!data.token || !data.user) {
        throw new Error(
          'Invalid login response from server.'
        )
      }

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
        <div className="sub">
          SMART CAMPUS MANAGEMENT
        </div>

        <h1>NEXVIA</h1>

        <p className="sub">
          One campus. One connected experience.
        </p>
      </div>

      <form
        className="card"
        onSubmit={submit}
      >
        <h2>Welcome back!</h2>

        <p className="sub">
          Choose your portal to continue.
        </p>

        <label>Login as</label>

        <select
          value={role}
          onChange={e =>
            setRole(e.target.value)
          }
        >
          <option value="student">
            Student
          </option>

          <option value="staff">
            Faculty Staff
          </option>

          <option value="campuscare">
            CampusCare Staff
          </option>
        </select>

        <label>
          {role === 'student'
            ? 'USN'
            : 'Staff ID'}
        </label>

        <input
          value={username}
          onChange={e =>
            setUsername(e.target.value)
          }
          placeholder="Enter your ID"
          required
        />

        <label>Password</label>

        <input
          type="password"
          value={password}
          onChange={e =>
            setPassword(e.target.value)
          }
          placeholder="Enter your password"
          required
        />

        {error && (
          <p className="bad-box">
            {error}
          </p>
        )}

        <button
          className="btn"
          disabled={loading}
        >
          {loading
            ? 'Signing in...'
            : 'Login'}
        </button>
      </form>
    </div>
  )
}

// =====================================================
// STUDENT HOME
// =====================================================

function StudentHome({
  token,
  user,
  onOpenAttendance,
}) {
  const [attendance, setAttendance] =
    useState([])

  const [claims, setClaims] =
    useState([])

  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [a, c] =
        await Promise.all([
          call(
            '/attendance/my/',
            token
          ),

          call(
            '/complaints/',
            token
          ),
        ])

      setAttendance(
        Array.isArray(a)
          ? a
          : a.results || []
      )

      setClaims(
        Array.isArray(c)
          ? c
          : c.results || []
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const present =
    attendance.reduce(
      (sum, item) =>
        sum +
        Number(item.present || 0),
      0
    )

  const total =
    attendance.reduce(
      (sum, item) =>
        sum +
        Number(item.total || 0),
      0
    )

  const percent =
    total
      ? Math.round(
          (present / total) * 100
        )
      : 0

  const timetable =
    readLocal(
      'nexvia_timetable',
      []
    )

  return (
    <>
      <div className="card">
        <div className="sub">
          STUDENT DASHBOARD
        </div>

        <h2>
          Hello,{' '}
          {user?.name || 'Student'} 👋
        </h2>

        <p className="sub">
          {user?.department || 'ISE'}{' '}
          Department
        </p>

        <div
          className="row"
          style={{ marginTop: 20 }}
        >
          <div>
            <div className="sub">
              Attendance
            </div>

            <h1>
              {loading
                ? '—'
                : `${percent}%`}
            </h1>
          </div>

          <div>
            <div className="sub">
              Classes attended
            </div>

            <h2>
              {loading
                ? '—'
                : `${present}/${total}`}
            </h2>
          </div>

          <div>
            <div className="sub">
              Claims
            </div>

            <h2>
              {loading
                ? '—'
                : claims.length}
            </h2>
          </div>
        </div>
      </div>

      {error && (
        <p className="bad-box">
          {error}
        </p>
      )}

      {/* IMPORTANT:
          This is the connection to the existing
          QR + BLE + biometric attendance flow.
      */}
      <div className="card">
        <h3>
          Attendance
        </h3>

        <p className="sub">
          Scan your faculty QR code and
          complete beacon + biometric
          verification.
        </p>

        <button
          className="btn"
          onClick={onOpenAttendance}
        >
          Scan attendance QR
        </button>
      </div>

      <SectionTitle>
        Subject-wise attendance
      </SectionTitle>

      {loading ? (
        <Empty>
          Loading attendance...
        </Empty>
      ) : attendance.length === 0 ? (
        <Empty>
          No attendance records
          available.
        </Empty>
      ) : (
        attendance.map(
          (item, index) => {
            const p = Number(
              item.percent ??
                (
                  item.total
                    ? (
                        item.present /
                        item.total
                      ) *
                      100
                    : 0
                )
            )

            return (
              <div
                className="card"
                key={
                  item.id ||
                  item.course ||
                  index
                }
              >
                <div className="row">
                  <strong>
                    {item.course ||
                      item.subject ||
                      'Subject'}
                  </strong>

                  <Tag
                    type={
                      p >= 75
                        ? 'ok'
                        : 'bad'
                    }
                  >
                    {Math.round(p)}%
                  </Tag>
                </div>

                <p className="sub">
                  {item.present || 0}
                  {' / '}
                  {item.total || 0}
                  {' '}
                  classes attended
                </p>

                <div className="bar">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        p
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )
          }
        )
      )}

      <SectionTitle>
        Timetable
      </SectionTitle>

      {timetable.length === 0 ? (
        <Empty>
          No timetable entries
          added yet.
        </Empty>
      ) : (
        timetable.map(item => (
          <div
            className="card"
            key={item.id}
          >
            <strong>
              {item.subject}
            </strong>

            <p className="sub">
              {item.day} · {item.time}
            </p>
          </div>
        ))
      )}
    </>
  )
}

// =====================================================
// QR CAMERA
// =====================================================

function QRScanner({
  onScan,
  onClose,
}) {
  const [error, setError] =
    useState('')

  useEffect(() => {
    let mounted = true

    const instance =
      new Html5Qrcode(
        'nexvia-qr-reader'
      )

    instance
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: {
            width: 220,
            height: 220,
          },
        },
        text => {
          if (!mounted) return

          onScan(text)

          instance
            .stop()
            .catch(() => {})
        },
        () => {}
      )
      .catch(err => {
        if (mounted) {
          setError(
            err?.message ||
              'Camera could not start.'
          )
        }
      })

    return () => {
      mounted = false

      if (instance.isScanning) {
        instance
          .stop()
          .catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="card">
      <div className="row">
        <h3>
          Scan QR code
        </h3>

        <button
          className="ghost sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div id="nexvia-qr-reader" />

      {error && (
        <p className="bad-box">
          {error}
        </p>
      )}
    </div>
  )
}

// =====================================================
// STUDENT QR + BLE + BIOMETRIC ATTENDANCE
// =====================================================

function ScanTab({ token }) {
  const [camera, setCamera] =
    useState(false)

  const [qr, setQr] =
    useState('')

  const [manual, setManual] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [busy, setBusy] =
    useState(false)

  const [verification, setVerification] =
    useState('')

  const handleScan =
    useCallback(value => {
      setQr(value)
      setMessage('')
      setVerification('')
      setCamera(false)
    }, [])

  async function verifyBeacon() {
    if (!navigator.bluetooth) {
      throw new Error(
        'Bluetooth is not supported in this browser. Open NEXVIA in Chrome on Android.'
      )
    }

    setVerification(
      'Searching for NEXVIA beacon...'
    )

    let device

    try {
 device =
  await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      BEACON_SERVICE_UUID,
    ],
  })
} catch (err) {
  if (
    err?.name ===
    'NotFoundError'
  ) {
    throw new Error(
      'No NEXVIA beacon was selected. Select NEXVIA-ISE-B204 from the Bluetooth device list.'
    )
  }

  throw new Error(
    err?.message ||
      'Bluetooth beacon selection failed.'
  )
}

    if (!device) {
      throw new Error(
        'NEXVIA beacon was not selected.'
      )
    }

    setVerification(
      'NEXVIA beacon found. Connecting...'
    )

    if (!device.gatt) {
      throw new Error(
        'The selected Bluetooth device does not support GATT.'
      )
    }

    let server

    try {
      server =
        await device.gatt.connect()
    } catch (err) {
      throw new Error(
        `Could not connect to NEXVIA beacon: ${
          err?.message ||
          'Bluetooth connection failed.'
        }`
      )
    }

    try {
      await server.getPrimaryService(
        BEACON_SERVICE_UUID
      )
    } catch (err) {
      throw new Error(
        'The selected device is not the NEXVIA-I​​SE-B204 beacon.'
      )
    } finally {
      try {
        if (
          device.gatt &&
          device.gatt.connected
        ) {
          device.gatt.disconnect()
        }
      } catch {
        // Ignore disconnect errors.
      }
    }

    setVerification(
      'NEXVIA beacon verified.'
    )

    return true
  }

  async function verifyBiometric() {
    if (!window.isSecureContext) {
      throw new Error(
        'Biometric verification requires HTTPS. Open the deployed NEXVIA app on Vercel.'
      )
    }

    if (
      !window.PublicKeyCredential ||
      !navigator.credentials
    ) {
      throw new Error(
        'Biometric verification is not supported on this device/browser.'
      )
    }

    setVerification(
      'Waiting for fingerprint / face verification...'
    )

    const challenge =
      crypto.getRandomValues(
        new Uint8Array(32)
      )

    const storedCredential =
      localStorage.getItem(
        'nexvia-biometric-credential'
      )

    if (!storedCredential) {
      const credential =
        await navigator.credentials.create(
          {
            publicKey: {
              challenge,

              rp: {
                name:
                  'NEXVIA Smart Campus',
              },

              user: {
                id:
                  crypto.getRandomValues(
                    new Uint8Array(16)
                  ),

                name:
                  'nexvia-student',

                displayName:
                  'NEXVIA Student',
              },

              pubKeyCredParams: [
                {
                  type: 'public-key',
                  alg: -7,
                },

                {
                  type: 'public-key',
                  alg: -257,
                },
              ],

              authenticatorSelection: {
                authenticatorAttachment:
                  'platform',

                userVerification:
                  'required',
              },

              timeout: 60000,

              attestation: 'none',
            },
          }
        )

      if (!credential) {
        throw new Error(
          'Biometric verification was cancelled.'
        )
      }

      const credentialId =
        Array.from(
          new Uint8Array(
            credential.rawId
          )
        )
          .map(byte =>
            byte
              .toString(16)
              .padStart(2, '0')
          )
          .join('')

      localStorage.setItem(
        'nexvia-biometric-credential',
        credentialId
      )
    } else {
      const credentialId =
        Uint8Array.from(
          storedCredential.match(
            /.{1,2}/g
          ) || [],
          byte =>
            parseInt(byte, 16)
        )

      const credential =
        await navigator.credentials.get(
          {
            publicKey: {
              challenge,

              allowCredentials: [
                {
                  type: 'public-key',
                  id: credentialId,
                },
              ],

              userVerification:
                'required',

              timeout: 60000,
            },
          }
        )

      if (!credential) {
        throw new Error(
          'Biometric verification was cancelled.'
        )
      }
    }

    setVerification(
      'Biometric verification successful.'
    )

    return true
  }

  async function mark(value) {
    if (
      !value ||
      !value.trim()
    ) {
      setMessage(
        'Please scan the attendance QR code first.'
      )
      return
    }

    setBusy(true)
    setMessage('')
    setVerification('')

    try {
      await verifyBeacon()

      await verifyBiometric()

      setVerification(
        'Verification complete. Marking attendance...'
      )

      const result =
        await call(
          '/attendance/mark/',
          token,
          {
            method: 'POST',

            body: JSON.stringify({
              qr_token:
                value.trim(),

              beacon_id:
                BEACON_ID,
            }),
          }
        )

      setMessage(
        result.message ||
          'Attendance marked successfully!'
      )

      setQr('')
      setManual('')
      setVerification('')
    } catch (err) {
      setVerification('')

      setMessage(
        err?.message ||
          'Attendance verification failed.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <h2>
          Scan attendance QR
        </h2>

        <p className="sub">
          Scan the QR code displayed by
          your faculty.
        </p>

        <button
          className="btn"
          onClick={() =>
            setCamera(true)
          }
          disabled={busy}
        >
          Open camera scanner
        </button>

        {camera && (
          <QRScanner
            onScan={handleScan}
            onClose={() =>
              setCamera(false)
            }
          />
        )}

        {qr && (
          <div
            className="card"
            style={{
              marginTop: 16,
            }}
          >
            <div className="sub">
              QR token detected
            </div>

            <p>
              Ready for physical
              beacon and biometric
              verification.
            </p>

            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                mark(qr)
              }
            >
              {busy
                ? 'Verifying...'
                : 'Mark attendance'}
            </button>
          </div>
        )}

        {verification && (
          <p
            className="sub"
            style={{
              marginTop: 12,
            }}
          >
            {verification}
          </p>
        )}

        {message && (
          <p
            className="bad-box"
            style={{
              marginTop: 12,
            }}
          >
            {message}
          </p>
        )}
      </div>

      <div className="card">
        <h3>
          Manual QR token
        </h3>

        <p className="sub">
          Enter the attendance token
          manually if required.
        </p>

        <input
          value={manual}
          onChange={e =>
            setManual(
              e.target.value
            )
          }
          placeholder="Enter QR token"
          disabled={busy}
        />

        <button
          className="btn"
          disabled={
            !manual.trim() ||
            busy
          }
          onClick={() =>
            mark(
              manual.trim()
            )
          }
        >
          {busy
            ? 'Verifying...'
            : 'Submit token'}
        </button>
      </div>
    </>
  )
}

// =====================================================
// STUDENT PORTAL
// =====================================================

function StudentPortal({
  token,
  user,
  onLogout,
}) {
  const [tab, setTab] =
    useState('home')

  const nav = [
    {
      id: 'home',
      label: 'Home',
      icon: '⌂',
    },

    {
      id: 'attendance',
      label: 'Attendance',
      icon: '▦',
    },
  ]

  return (
    <Shell
      title="Student Portal"
      subtitle="Smart campus student experience"
      onLogout={onLogout}
    >
      {tab === 'home' && (
        <StudentHome
          token={token}
          user={user}
          onOpenAttendance={() =>
            setTab('attendance')
          }
        />
      )}

      {tab === 'attendance' && (
        <ScanTab
          token={token}
        />
      )}

      <BottomNav
        items={nav}
        active={tab}
        onChange={setTab}
      />
    </Shell>
  )
}

// =====================================================
// FACULTY ATTENDANCE
// =====================================================

function StaffSession({
  token,
}) {
  const [session, setSession] =
    useState(null)

  const [course, setCourse] =
    useState(
      'Computer Networks'
    )

  const [semester, setSemester] =
    useState('5')

  const [seconds, setSeconds] =
    useState(30)

  const [busy, setBusy] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [roster, setRoster] =
    useState([])

  const refresh =
    useCallback(
      async id => {
        try {
          const data =
            await call(
              `/attendance/sessions/${id}/refresh/`,
              token,
              {
                method: 'POST',
              }
            )

          setSession(data)
          setSeconds(30)
        } catch (err) {
          setMessage(
            err.message
          )
        }
      },
      [token]
    )

  const loadRoster =
    useCallback(
      async id => {
        try {
          const data =
            await call(
              `/attendance/sessions/${id}/report/`,
              token
            )

          setRoster(
            data.rows ||
              data.records ||
              []
          )
        } catch (err) {
          setMessage(
            err.message
          )
        }
      },
      [token]
    )

  useEffect(() => {
    if (!session?.id) return

    const timer =
      setInterval(() => {
        setSeconds(value => {
          if (value <= 1) {
            refresh(
              session.id
            )

            return 30
          }

          return value - 1
        })
      }, 1000)

    return () =>
      clearInterval(timer)
  }, [
    session?.id,
    refresh,
  ])

  async function start() {
    setBusy(true)
    setMessage('')
    setRoster([])

    try {
      const data =
        await call(
          '/attendance/sessions/start/',
          token,
          {
            method: 'POST',

            body: JSON.stringify({
              course,
              semester,
              beacon_id:
                BEACON_ID,
            }),
          }
        )

      setSession(data)
      setSeconds(30)

      await loadRoster(
        data.id
      )
    } catch (err) {
      setMessage(
        err.message
      )
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    setBusy(true)

    try {
      await call(
        `/attendance/sessions/${session.id}/stop/`,
        token,
        {
          method: 'POST',
        }
      )

      setSession(null)

      setMessage(
        'Attendance session stopped.'
      )
    } catch (err) {
      setMessage(
        err.message
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>
        Attendance session
      </h2>

      <p className="sub">
        Start a session and display
        the QR code to students.
      </p>

      {!session ? (
        <>
          <label>
            Subject
          </label>

          <select
            value={course}
            onChange={e =>
              setCourse(
                e.target.value
              )
            }
          >
            {[
              'Computer Networks',
              'Big Data',
              'Software Engineering',
              'DBMS',
              'Operating Systems',
              'Web Technology',
            ].map(x => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>

          <label>
            Semester
          </label>

          <select
            value={semester}
            onChange={e =>
              setSemester(
                e.target.value
              )
            }
          >
            {[
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
            ].map(x => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>

          <button
            className="btn"
            onClick={start}
            disabled={busy}
          >
            {busy
              ? 'Starting...'
              : 'Start attendance'}
          </button>
        </>
      ) : (
        <>
          <div className="sub">
            ACTIVE SESSION
          </div>

          <h2>
            {session.course}
          </h2>

          <p className="sub">
            Semester{' '}
            {session.semester}
          </p>

          <div
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 16,
              width: 'fit-content',
              margin:
                '20px auto',
            }}
          >
            <QRCodeSVG
              value={
                session.qr_token ||
                ''
              }
              size={220}
            />
          </div>

          <h1
            style={{
              textAlign:
                'center',
            }}
          >
            {seconds}s
          </h1>

          <p
            className="sub"
            style={{
              textAlign:
                'center',
            }}
          >
            QR refresh countdown
          </p>

          <p>
            <strong>
              Present:
            </strong>{' '}
            {session.present ??
              0}
          </p>

          <button
            className="ghost"
            onClick={() =>
              refresh(
                session.id
              )
            }
          >
            Refresh QR
          </button>

          <button
            className="ghost"
            onClick={() =>
              loadRoster(
                session.id
              )
            }
          >
            Refresh present list
          </button>

          <button
            className="btn"
            onClick={stop}
            disabled={busy}
          >
            Stop attendance
          </button>

          <SectionTitle>
            Student attendance list
          </SectionTitle>

          {roster.length === 0 ? (
            <Empty>
              No students found for
              this department yet.
              Add students under
              Student Management.
            </Empty>
          ) : (
            roster.map(row => (
              <div
                className="row"
                key={row.usn}
              >
                <div>
                  <strong>
                    {row.name}
                  </strong>

                  <p className="sub">
                    {row.usn}
                  </p>
                </div>

                <Tag
                  type={
                    row.status ===
                    'Present'
                      ? 'ok'
                      : 'bad'
                  }
                >
                  {row.status}
                </Tag>
              </div>
            ))
          )}
        </>
      )}

      {message && (
        <p className="note">
          {message}
        </p>
      )}
    </div>
  )
}

// =====================================================
// FACULTY REPORTS
// =====================================================

function StaffReports({
  token,
}) {
  const [sessions, setSessions] =
    useState([])

  const [selected, setSelected] =
    useState('')

  const [report, setReport] =
    useState(null)

  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    call(
      '/attendance/sessions/',
      token
    )
      .then(data =>
        setSessions(
          Array.isArray(data)
            ? data
            : data.results || []
        )
      )
      .catch(err =>
        setError(
          err.message
        )
      )
  }, [token])

  async function loadReport(id) {
    setSelected(id)
    setReport(null)

    if (!id) return

    setLoading(true)
    setError('')

    try {
      setReport(
        await call(
          `/attendance/sessions/${id}/report/`,
          token
        )
      )
    } catch (err) {
      setError(
        err.message
      )
    } finally {
      setLoading(false)
    }
  }

  async function exportExcel() {
    try {
      const response =
        await call(
          `/attendance/sessions/${selected}/excel/`,
          token,
          {
            raw: true,
          }
        )

      const blob =
        await response.blob()

      const url =
        URL.createObjectURL(
          blob
        )

      const link =
        document.createElement(
          'a'
        )

      link.href = url

      link.download =
        `attendance-${selected}.xlsx`

      link.click()

      URL.revokeObjectURL(
        url
      )
    } catch (err) {
      setError(
        err.message
      )
    }
  }

  const rows =
    report?.rows ||
    report?.records ||
    []

  return (
    <>
      <div className="card">
        <h2>
          Attendance reports
        </h2>

        <label>
          Select session
        </label>

        <select
          value={selected}
          onChange={e =>
            loadReport(
              e.target.value
            )
          }
        >
          <option value="">
            Choose a session
          </option>

          {sessions.map(item => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.course} ·{' '}
              {fmt(
                item.started_at
              )}
            </option>
          ))}
        </select>

        <button
          className="btn"
          disabled={!selected}
          onClick={
            exportExcel
          }
        >
          Export Excel
        </button>

        {error && (
          <p className="bad-box">
            {error}
          </p>
        )}
      </div>

      {loading && (
        <Empty>
          Loading report...
        </Empty>
      )}

      {report && (
        <>
          <div className="card">
            <h3>
              {report.session
                ?.course ||
                'Attendance report'}
            </h3>

            <p className="sub">
              {fmt(
                report.session
                  ?.started_at
              )}
            </p>

            <p>
              Total students:{' '}
              {rows.length}
            </p>
          </div>

          <SectionTitle>
            Attendance records
          </SectionTitle>

          {rows.length === 0 ? (
            <Empty>
              No students have been
              entered for this
              department.
            </Empty>
          ) : (
            rows.map(
              (
                row,
                index
              ) => (
                <div
                  className="card"
                  key={
                    row.usn ||
                    row.id ||
                    index
                  }
                >
                  <strong>
                    {row.name ||
                      row.student_name ||
                      row.student ||
                      `Student ${
                        index +
                        1
                      }`}
                  </strong>

                  <p className="sub">
                    {row.usn ||
                      row.roll_number ||
                      ''}
                  </p>

                  <Tag
                    type={
                      row.status ===
                      'Present'
                        ? 'ok'
                        : 'bad'
                    }
                  >
                    {row.status ||
                      'Present'}
                  </Tag>
                </div>
              )
            )
          )}
        </>
      )}
    </>
  )
}

// =====================================================
// CLASSES + TIMETABLE
// =====================================================

const DEFAULT_CLASSES = [
  {
    id: 1,
    name: 'Computer Networks',
    semester: '5',
    faculty: 'Faculty',
    students: [],
  },

  {
    id: 2,
    name: 'Big Data',
    semester: '5',
    faculty: 'Faculty',
    students: [],
  },

  {
    id: 3,
    name: 'Software Engineering',
    semester: '5',
    faculty: 'Faculty',
    students: [],
  },
]

function StaffClasses() {
  const [classes, setClasses] =
    useState(
      () =>
        readLocal(
          'nexvia_classes',
          DEFAULT_CLASSES
        )
    )

  const [selectedId, setSelectedId] =
    useState(null)

  const [name, setName] =
    useState('')

  const [semester, setSemester] =
    useState('5')

  const [faculty, setFaculty] =
    useState('')

  const [studentName, setStudentName] =
    useState('')

  const [usn, setUsn] =
    useState('')

  const [timetable, setTimetable] =
    useState(
      () =>
        readLocal(
          'nexvia_timetable',
          []
        )
    )

  const [day, setDay] =
    useState('Monday')

  const [time, setTime] =
    useState('')

  const [subject, setSubject] =
    useState('')

  const selected =
    classes.find(
      item =>
        item.id ===
        selectedId
    )

  function updateClasses(next) {
    setClasses(next)
    saveLocal(
      'nexvia_classes',
      next
    )
  }

  function addClass(e) {
    e.preventDefault()

    if (!name.trim()) return

    updateClasses([
      ...classes,

      {
        id: Date.now(),
        name: name.trim(),
        semester,
        faculty:
          faculty.trim() ||
          'Not assigned',
        students: [],
      },
    ])

    setName('')
    setFaculty('')
  }

  function addStudent(e) {
    e.preventDefault()

    if (
      !selected ||
      !studentName.trim() ||
      !usn.trim()
    ) {
      return
    }

    updateClasses(
      classes.map(item =>
        item.id ===
        selectedId
          ? {
              ...item,

              students: [
                ...item.students,

                {
                  id: Date.now(),
                  name:
                    studentName.trim(),
                  usn:
                    usn.trim(),
                },
              ],
            }
          : item
      )
    )

    setStudentName('')
    setUsn('')
  }

  function addTimetable(e) {
    e.preventDefault()

    if (
      !subject.trim() ||
      !time.trim()
    ) {
      return
    }

    const next = [
      ...timetable,

      {
        id: Date.now(),
        day,
        time,
        subject:
          subject.trim(),
      },
    ]

    setTimetable(next)

    saveLocal(
      'nexvia_timetable',
      next
    )

    setSubject('')
    setTime('')
  }

  return (
    <>
      <div className="card">
        <h2>
          Classes management
        </h2>

        <p className="note">
          Class and timetable
          entries are saved in this
          browser only. Use Student
          Management for the official
          database student roster.
        </p>

        <form
          onSubmit={addClass}
        >
          <label>
            Class name
          </label>

          <input
            value={name}
            onChange={e =>
              setName(
                e.target.value
              )
            }
            required
          />

          <label>
            Semester
          </label>

          <select
            value={semester}
            onChange={e =>
              setSemester(
                e.target.value
              )
            }
          >
            {[
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
            ].map(x => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>

          <label>
            Faculty
          </label>

          <input
            value={faculty}
            onChange={e =>
              setFaculty(
                e.target.value
              )
            }
          />

          <button className="btn">
            Add class
          </button>
        </form>
      </div>

      <SectionTitle>
        Class list
      </SectionTitle>

      {classes.map(item => (
        <div
          className="card"
          key={item.id}
        >
          <strong>
            {item.name}
          </strong>

          <p className="sub">
            Semester{' '}
            {item.semester} ·{' '}
            {item.faculty} ·{' '}
            {item.students.length}{' '}
            local demo students
          </p>

          <button
            className="ghost sm"
            onClick={() =>
              setSelectedId(
                item.id
              )
            }
          >
            View class
          </button>
        </div>
      ))}

      {selected && (
        <div className="card">
          <div className="row">
            <h3>
              {selected.name}
            </h3>

            <button
              className="ghost sm"
              onClick={() =>
                setSelectedId(
                  null
                )
              }
            >
              Close
            </button>
          </div>

          <form
            onSubmit={
              addStudent
            }
          >
            <label>
              Student name
              (local class demo
              only)
            </label>

            <input
              value={
                studentName
              }
              onChange={e =>
                setStudentName(
                  e.target.value
                )
              }
              required
            />

            <label>
              USN
            </label>

            <input
              value={usn}
              onChange={e =>
                setUsn(
                  e.target.value
                )
              }
              required
            />

            <button className="btn">
              Add to local class
            </button>
          </form>

          <SectionTitle>
            Local class students
          </SectionTitle>

          {selected.students.map(
            student => (
              <p
                key={
                  student.id
                }
              >
                {student.name} ·{' '}
                {student.usn}
              </p>
            )
          )}
        </div>
      )}

      <SectionTitle>
        Timetable management
      </SectionTitle>

      <div className="card">
        <form
          onSubmit={
            addTimetable
          }
        >
          <label>
            Day
          </label>

          <select
            value={day}
            onChange={e =>
              setDay(
                e.target.value
              )
            }
          >
            {[
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ].map(x => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>

          <label>
            Time
          </label>

          <input
            value={time}
            onChange={e =>
              setTime(
                e.target.value
              )
            }
            placeholder="10:00 AM - 11:00 AM"
            required
          />

          <label>
            Subject
          </label>

          <input
            value={subject}
            onChange={e =>
              setSubject(
                e.target.value
              )
            }
            required
          />

          <button className="btn">
            Add timetable entry
          </button>
        </form>
      </div>

      {timetable.map(item => (
        <div
          className="card"
          key={item.id}
        >
          <div className="row">
            <div>
              <strong>
                {item.subject}
              </strong>

              <p className="sub">
                {item.day} ·{' '}
                {item.time}
              </p>
            </div>

            <button
              className="ghost sm"
              onClick={() => {
                const next =
                  timetable.filter(
                    row =>
                      row.id !==
                      item.id
                  )

                setTimetable(
                  next
                )

                saveLocal(
                  'nexvia_timetable',
                  next
                )
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

// =====================================================
// FACULTY STUDENT MANAGEMENT
// =====================================================
//
// This component was missing from your original
// App.jsx. The missing definition could crash
// FacultyPortal when the Students tab opened.
//
// This version deliberately keeps it simple and
// does not invent a backend endpoint that we have
// not verified.
// =====================================================

function StaffStudents({
  token,
}) {
  const [sessions, setSessions] =
    useState([])

  const [selected, setSelected] =
    useState('')

  const [students, setStudents] =
    useState([])

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadSessions() {
    setLoading(true)
    setError('')

    try {
      const data =
        await call(
          '/attendance/sessions/',
          token
        )

      const list =
        Array.isArray(data)
          ? data
          : data.results || []

      setSessions(list)
    } catch (err) {
      setError(
        err.message
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents(id) {
    setSelected(id)
    setStudents([])
    setError('')

    if (!id) return

    setLoading(true)

    try {
      const data =
        await call(
          `/attendance/sessions/${id}/report/`,
          token
        )

      setStudents(
        data.rows ||
          data.records ||
          []
      )
    } catch (err) {
      setError(
        err.message
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  return (
    <>
      <div className="card">
        <h2>
          Student Management
        </h2>

        <p className="sub">
          View students recorded
          through attendance
          sessions.
        </p>

        <button
          className="ghost"
          onClick={
            loadSessions
          }
        >
          Refresh students
        </button>

        <label>
          Select attendance
          session
        </label>

        <select
          value={selected}
          onChange={e =>
            loadStudents(
              e.target.value
            )
          }
        >
          <option value="">
            Choose a session
          </option>

          {sessions.map(item => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.course} ·{' '}
              {fmt(
                item.started_at
              )}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="bad-box">
          {error}
        </p>
      )}

      {loading && (
        <Empty>
          Loading students...
        </Empty>
      )}

      {!loading &&
        selected &&
        students.length === 0 && (
          <Empty>
            No student records
            available for this
            session.
          </Empty>
        )}

      {!loading &&
        students.length > 0 &&
        students.map(
          (student, index) => (
            <div
              className="card"
              key={
                student.usn ||
                student.id ||
                index
              }
            >
              <div className="row">
                <div>
                  <strong>
                    {student.name ||
                      student.student_name ||
                      'Student'}
                  </strong>

                  <p className="sub">
                    {student.usn ||
                      student.roll_number ||
                      ''}
                  </p>
                </div>

                <Tag
                  type={
                    student.status ===
                    'Present'
                      ? 'ok'
                      : 'bad'
                  }
                >
                  {student.status ||
                    'Present'}
                </Tag>
              </div>
            </div>
          )
        )}

      {!selected &&
        !loading && (
          <Empty>
            Select an attendance
            session to view its
            student records.
          </Empty>
        )}
    </>
  )
}

// =====================================================
// CAMPUSCARE
// =====================================================

function CampusCareClaims({
  token,
}) {
  const [items, setItems] =
    useState([])

  const [filter, setFilter] =
    useState('All')

  const [responses, setResponses] =
    useState({})

  const [busyId, setBusyId] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const load =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const data =
          await call(
            '/complaints/',
            token
          )

        setItems(
          Array.isArray(data)
            ? data
            : data.results || []
        )
      } catch (err) {
        setError(
          err.message
        )
      } finally {
        setLoading(false)
      }
    }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function update(
    item,
    status
  ) {
    setBusyId(item.id)
    setError('')
    setMessage('')

    try {
      await call(
        `/complaints/${item.id}/update/`,
        token,
        {
          method: 'PATCH',

          body: JSON.stringify({
            status,

            response:
              responses[
                item.id
              ] ??
              item.response ??
              '',
          }),
        }
      )

      setMessage(
        `Claim #${item.id} updated to ${status}.`
      )

      await load()
    } catch (err) {
      setError(
        err.message
      )
    } finally {
      setBusyId(null)
    }
  }

  const filtered =
    filter === 'All'
      ? items
      : items.filter(
          item =>
            item.status ===
            filter
        )

  return (
    <>
      <div className="card">
        <h2>
          CampusCare claims
        </h2>

        <p className="sub">
          Review student concerns,
          assign action, and resolve
          complaints.
        </p>

        <div className="row wrap">
          {[
            'All',
            'Pending',
            'Assigned',
            'Action Started',
            'Resolved',
          ].map(value => (
            <button
              key={value}
              className={
                filter === value
                  ? 'btn sm'
                  : 'ghost sm'
              }
              onClick={() =>
                setFilter(
                  value
                )
              }
            >
              {value}
            </button>
          ))}
        </div>

        <button
          className="ghost sm"
          onClick={load}
        >
          Refresh claims
        </button>
      </div>

      {message && (
        <p className="ok-box">
          {message}
        </p>
      )}

      {error && (
        <p className="bad-box">
          {error}
        </p>
      )}

      {loading ? (
        <Empty>
          Loading claims...
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty>
          No claims in this
          category.
        </Empty>
      ) : (
        filtered.map(item => (
          <div
            className="card"
            key={item.id}
          >
            <div className="row">
              <strong>
                #{item.id} ·{' '}
                {item.category}
              </strong>

              <Tag>
                {item.status}
              </Tag>
            </div>

            <p>
              {item.description}
            </p>

            <p className="sub">
              Anonymous claim ·
              Student identity
              protected
            </p>

            <p className="sub">
              Raised:{' '}
              {fmt(
                item.raised_at
              )}
            </p>

            <label>
              Response to
              student
            </label>

            <textarea
              rows="2"
              value={
                responses[
                  item.id
                ] ??
                item.response ??
                ''
              }
              onChange={e =>
                setResponses(
                  old => ({
                    ...old,

                    [item.id]:
                      e.target
                        .value,
                  })
                )
              }
              placeholder="Write an update or resolution..."
            />

            <div className="row wrap">
              <button
                className="ghost sm"
                disabled={
                  busyId ===
                  item.id
                }
                onClick={() =>
                  update(
                    item,
                    'Assigned'
                  )
                }
              >
                Assign
              </button>

              <button
                className="ghost sm"
                disabled={
                  busyId ===
                  item.id
                }
                onClick={() =>
                  update(
                    item,
                    'Action Started'
                  )
                }
              >
                Start action
              </button>

              <button
                className="btn sm"
                disabled={
                  busyId ===
                  item.id
                }
                onClick={() =>
                  update(
                    item,
                    'Resolved'
                  )
                }
              >
                Resolve
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}

function CampusCarePortal({
  token,
  onLogout,
}) {
  return (
    <Shell
      title="CampusCare Staff Portal"
      subtitle="Manage and resolve student claims"
      onLogout={onLogout}
    >
      <CampusCareClaims
        token={token}
      />
    </Shell>
  )
}

// =====================================================
// FACULTY PORTAL
// =====================================================

function FacultyPortal({
  token,
  onLogout,
}) {
  const [tab, setTab] =
    useState('students')

  const nav = [
    {
      id: 'students',
      label: 'Students',
      icon: '♙',
    },

    {
      id: 'attendance',
      label: 'Attendance',
      icon: '▦',
    },

    {
      id: 'classes',
      label: 'Classes',
      icon: '▤',
    },

    {
      id: 'reports',
      label: 'Reports',
      icon: '▥',
    },
  ]

  return (
    <Shell
      title="Faculty Staff Portal"
      subtitle="Manage student records and attendance"
      onLogout={onLogout}
    >
      {tab === 'students' && (
        <StaffStudents
          token={token}
        />
      )}

      {tab === 'attendance' && (
        <StaffSession
          token={token}
        />
      )}

      {tab === 'classes' && (
        <StaffClasses />
      )}

      {tab === 'reports' && (
        <StaffReports
          token={token}
        />
      )}

      <BottomNav
        items={nav}
        active={tab}
        onChange={setTab}
      />
    </Shell>
  )
}

// =====================================================
// MAIN APP
// =====================================================

export default function App() {
  const [auth, setAuth] =
    useState(() =>
      readLocal(
        'nexvia_auth',
        null
      )
    )

  function login(data) {
    const next = {
      token: data.token,
      user: data.user,
    }

    saveLocal(
      'nexvia_auth',
      next
    )

    setAuth(next)
  }

  function logout() {
    localStorage.removeItem(
      'nexvia_auth'
    )

    setAuth(null)
  }

  // No valid login -> LOGIN PAGE
  if (!auth?.token) {
    return (
      <Login
        onLogin={login}
      />
    )
  }

  const role = String(
    auth.user?.role || ''
  ).toLowerCase()

  // CampusCare
  if (
    role === 'campuscare'
  ) {
    return (
      <CampusCarePortal
        token={auth.token}
        onLogout={logout}
      />
    )
  }

  // Faculty
  if (role === 'staff') {
    return (
      <FacultyPortal
        token={auth.token}
        onLogout={logout}
      />
    )
  }

  // Student
  if (role === 'student') {
    return (
      <StudentPortal
        token={auth.token}
        user={auth.user}
        onLogout={logout}
      />
    )
  }

  // Invalid role
  localStorage.removeItem(
    'nexvia_auth'
  )

  return (
    <Login
      onLogin={login}
    />
  )
}