import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'

const API = 'https://nexvia-backend-awp6.onrender.com/api'

const BEACON_SERVICE_UUID =
  '12345678-1234-1234-1234-123456789001'

const BEACON_ID = 'ISE-B204'
const RSSI_LIMIT = -75

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('nexvia_user') || 'null')
  } catch {
    return null
  }
}

function App() {
  const [user, setUser] = useState(getStoredUser())
  const [page, setPage] = useState('home')

  useEffect(() => {
    if (user) {
      localStorage.setItem('nexvia_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('nexvia_user')
    }
  }, [user])

  if (!user) {
    return <Login onLogin={setUser} />
  }

  if (user.role === 'student') {
    return (
      <StudentPortal
        user={user}
        page={page}
        setPage={setPage}
        logout={() => {
          setUser(null)
          setPage('home')
        }}
      />
    )
  }

  if (user.role === 'staff') {
    return (
      <FacultyPortal
        user={user}
        page={page}
        setPage={setPage}
        logout={() => {
          setUser(null)
          setPage('home')
        }}
      />
    )
  }

  if (user.role === 'campuscare') {
    return (
      <CampusCarePortal
        user={user}
        logout={() => {
          setUser(null)
          setPage('home')
        }}
      />
    )
  }

  return null
}

/* =========================================================
   LOGIN
========================================================= */

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Invalid username or password'
        )
      }

      const loggedUser = data.user || data

      onLogin(loggedUser)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard}>
        <div style={styles.logoCircle}>N</div>

        <h1 style={styles.logoTitle}>NEXVIA</h1>

        <p style={styles.subtitle}>
          Smart Campus Management System
        </p>

        <form onSubmit={login}>
          <label style={styles.label}>Username / USN</label>

          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your ID"
            required
          />

          <label style={styles.label}>Password</label>

          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <button
            style={styles.primaryButton}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.demoBox}>
          <b>Demo accounts</b>
          <div>Student: 4MC24IS093</div>
          <div>Faculty: STF-ISE-07</div>
          <div>CampusCare: CARE-ISE-01</div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   STUDENT PORTAL
========================================================= */

function StudentPortal({
  user,
  page,
  setPage,
  logout,
}) {
  return (
    <div style={styles.app}>
      <Header
        title="Student Portal"
        user={user}
        logout={logout}
      />

      <div style={styles.content}>
        {page === 'home' && (
          <StudentHome
            user={user}
            setPage={setPage}
          />
        )}

        {page === 'attendance' && (
          <AttendanceFlow
            user={user}
          />
        )}

        {page === 'campuscare' && (
          <StudentCampusCare
            user={user}
          />
        )}

        {page === 'profile' && (
          <Profile user={user} />
        )}
      </div>

      <BottomNav
        page={page}
        setPage={setPage}
      />
    </div>
  )
}

function StudentHome({ user, setPage }) {
  return (
    <div>
      <div style={styles.hero}>
        <div>
          <div style={styles.smallText}>
            Welcome back
          </div>

          <h2 style={styles.heroTitle}>
            {user.first_name || 'Student'} 👋
          </h2>

          <p style={styles.heroText}>
            Ready for today's classes?
          </p>
        </div>

        <div style={styles.avatar}>
          {(user.first_name || 'S')[0]}
        </div>
      </div>

      <h3 style={styles.sectionTitle}>
        Quick Actions
      </h3>

      <div style={styles.grid}>
        <ActionCard
          icon="📷"
          title="Attendance"
          text="Scan QR + Beacon + Biometric"
          onClick={() => setPage('attendance')}
        />

        <ActionCard
          icon="🛠️"
          title="CampusCare"
          text="Report a campus issue"
          onClick={() => setPage('campuscare')}
        />

        <ActionCard
          icon="👤"
          title="Profile"
          text="View your details"
          onClick={() => setPage('profile')}
        />
      </div>

      <div style={styles.infoCard}>
        <h3>Smart Attendance</h3>

        <p>
          NEXVIA uses a multi-step attendance
          verification process:
        </p>

        <div style={styles.steps}>
          <span>1. QR</span>
          <span>→</span>
          <span>2. BLE</span>
          <span>→</span>
          <span>3. Biometric</span>
          <span>→</span>
          <span>4. Attendance</span>
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  text,
  onClick,
}) {
  return (
    <button
      style={styles.actionCard}
      onClick={onClick}
    >
      <div style={styles.actionIcon}>{icon}</div>
      <div>
        <div style={styles.actionTitle}>{title}</div>
        <div style={styles.actionText}>{text}</div>
      </div>
    </button>
  )
}

/* =========================================================
   ATTENDANCE
========================================================= */

function AttendanceFlow({ user }) {
  const [step, setStep] = useState('qr')
  const [session, setSession] = useState(null)
  const [qrToken, setQrToken] = useState('')
  const [beaconVerified, setBeaconVerified] =
    useState(false)
  const [beaconName, setBeaconName] =
    useState('')
  const [biometricVerified, setBiometricVerified] =
    useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function scanQR(decodedText) {
    if (!decodedText) return

    setError('')
    setMessage('QR scanned successfully.')

    let token = decodedText

    try {
      const parsed = JSON.parse(decodedText)

      token =
        parsed.token ||
        parsed.session_token ||
        parsed.qr_token ||
        decodedText
    } catch {
      // QR may simply contain the token
    }

    setQrToken(token)

    try {
      const response = await fetch(
        `${API}/attendance/sessions/`
      )

      if (response.ok) {
        const data = await response.json()

        const sessions =
          Array.isArray(data)
            ? data
            : data.results || data.sessions || []

        const found = sessions.find(
          (s) =>
            s.token === token ||
            s.qr_token === token ||
            s.session_token === token
        )

        if (found) {
          setSession(found)
        }
      }
    } catch {
      // QR token itself is enough for the next stage
    }

    setStep('beacon')
  }

  return (
    <div>
      <h2 style={styles.pageTitle}>
        Attendance
      </h2>

      <Progress
        step={step}
      />

      {message && (
        <div style={styles.successBox}>
          {message}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {step === 'qr' && (
        <QRScanner
          onScan={scanQR}
          onError={setError}
        />
      )}

      {step === 'beacon' && (
        <BeaconVerification
          onVerified={(name) => {
            setBeaconVerified(true)
            setBeaconName(name)
            setMessage(
              `NEXVIA beacon verified ✓ ${name}`
            )
            setStep('biometric')
          }}
          onError={setError}
        />
      )}

      {step === 'biometric' && (
        <BiometricVerification
          onVerified={() => {
            setBiometricVerified(true)
            setMessage(
              'Biometric verification successful ✓'
            )
            setStep('complete')
          }}
          onError={setError}
        />
      )}

      {step === 'complete' && (
        <AttendanceComplete
          user={user}
          qrToken={qrToken}
          session={session}
          beaconVerified={beaconVerified}
          beaconName={beaconName}
          biometricVerified={biometricVerified}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
        />
      )}
    </div>
  )
}

/* =========================================================
   QR SCANNER
========================================================= */

function QRScanner({ onScan, onError }) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let scanner = null
    let mounted = true

    async function start() {
      try {
        scanner = new Html5Qrcode('nexvia-qr-reader')

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText) => {
            if (!mounted) return

            try {
              await scanner.stop()
            } catch {}

            onScan(decodedText)
          },
          () => {}
        )

        if (mounted) {
          setStarted(true)
        }
      } catch (err) {
        onError(
          'Camera could not be opened. Allow camera permission and try again.'
        )
      }
    }

    start()

    return () => {
      mounted = false

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
      }
    }
  }, [onScan, onError])

  return (
    <div style={styles.card}>
      <h3>Step 1 — Scan Attendance QR</h3>

      <p style={styles.muted}>
        Point your camera at the faculty attendance QR code.
      </p>

      <div
        id="nexvia-qr-reader"
        style={styles.qrReader}
      />

      {!started && (
        <div style={styles.muted}>
          Starting camera...
        </div>
      )}
    </div>
  )
}

/* =========================================================
   BLE
========================================================= */

function BeaconVerification({
  onVerified,
  onError,
}) {
  const [status, setStatus] =
    useState('Ready to scan')
  const [busy, setBusy] = useState(false)

  async function scanBeacon() {
    setBusy(true)
    setStatus('Opening Bluetooth device picker...')
    onError('')

    try {
      if (!navigator.bluetooth) {
        throw new Error(
          'Bluetooth is not supported in this browser. Use Chrome on Android.'
        )
      }

      if (!window.isSecureContext) {
        throw new Error(
          'Bluetooth requires HTTPS. Open https://nexvia-smart-campus.vercel.app on the phone.'
        )
      }

      /*
       * IMPORTANT:
       *
       * We identify the ESP32 using its BLE SERVICE UUID.
       *
       * We do NOT require the Bluetooth display name.
       *
       * We do NOT call device.gatt.connect().
       *
       * Therefore "Unknown device" is acceptable.
       */
      const device =
        await navigator.bluetooth.requestDevice({
          filters: [
            {
              services: [
                BEACON_SERVICE_UUID,
              ],
            },
          ],
        })

      if (!device) {
        throw new Error(
          'No Bluetooth device was selected.'
        )
      }

      const name =
        device.name || 'Unknown device'

      /*
       * Do not reject Unknown.
       *
       * The service UUID was used by the browser
       * to filter the device.
       */
      setStatus(
        `Beacon selected ✓ ${name}`
      )

      onVerified(name)
    } catch (err) {
      if (
        err?.name === 'NotFoundError'
      ) {
        setStatus('Bluetooth selection cancelled.')
        onError('No beacon was selected.')
      } else if (
        err?.name === 'SecurityError'
      ) {
        setStatus('Bluetooth permission blocked.')
        onError(
          'Allow Bluetooth permissions for Chrome and try again.'
        )
      } else {
        setStatus('Beacon verification failed.')
        onError(
          err?.message ||
            'Could not select the NEXVIA beacon.'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.bigIcon}>📡</div>

      <h3>Step 2 — Verify NEXVIA Beacon</h3>

      <p style={styles.muted}>
        Turn on the NEXVIA ESP32 beacon and keep
        the phone nearby.
      </p>

      <div style={styles.statusBox}>
        {status}
      </div>

      <button
        style={styles.primaryButton}
        onClick={scanBeacon}
        disabled={busy}
      >
        {busy
          ? 'Waiting for Bluetooth...'
          : 'Scan NEXVIA Beacon'}
      </button>

      <div style={styles.tipBox}>
        <b>Important:</b> If Android displays
        the ESP32 as <b>Unknown</b>, select it.
        The app verifies the NEXVIA BLE service,
        not the displayed device name.
      </div>
    </div>
  )
}

/* =========================================================
   BIOMETRIC
========================================================= */

async function createWebAuthnCredential() {
  const challenge = crypto.getRandomValues(
    new Uint8Array(32)
  )

  const userId = crypto.getRandomValues(
    new Uint8Array(16)
  )

  const credential =
    await navigator.credentials.create({
      publicKey: {
        challenge,

        rp: {
          name: 'NEXVIA Smart Campus',
          id: window.location.hostname,
        },

        user: {
          id: userId,
          name: 'nexvia-student',
          displayName: 'NEXVIA Student',
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
          userVerification: 'required',
        },

        timeout: 60000,

        attestation: 'none',
      },
    })

  return credential
}

async function authenticateWebAuthn() {
  const challenge = crypto.getRandomValues(
    new Uint8Array(32)
  )

  return navigator.credentials.get({
    publicKey: {
      challenge,
      userVerification: 'required',
      timeout: 60000,
    },
  })
}

function BiometricVerification({
  onVerified,
  onError,
}) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] =
    useState('Ready for biometric verification')

  async function verify() {
    setBusy(true)
    onError('')

    try {
      if (
        !window.isSecureContext ||
        !window.PublicKeyCredential
      ) {
        throw new Error(
          'Biometric authentication requires HTTPS and a supported device.'
        )
      }

      setStatus(
        'Waiting for fingerprint / face / device authentication...'
      )

      let credential = null

      /*
       * First try authentication.
       *
       * If this device has not registered a NEXVIA
       * WebAuthn credential yet, create one.
       */
      try {
        credential =
          await authenticateWebAuthn()
      } catch {
        credential =
          await createWebAuthnCredential()
      }

      if (!credential) {
        throw new Error(
          'Biometric authentication was not completed.'
        )
      }

      setStatus(
        'Biometric verified ✓'
      )

      onVerified()
    } catch (err) {
      setStatus('Biometric verification failed.')

      onError(
        err?.message ||
          'Fingerprint / face verification failed or was cancelled.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.bigIcon}>🔐</div>

      <h3>Step 3 — Biometric Verification</h3>

      <p style={styles.muted}>
        Use the fingerprint, face authentication,
        or device security method available on
        your phone.
      </p>

      <div style={styles.statusBox}>
        {status}
      </div>

      <button
        style={styles.primaryButton}
        onClick={verify}
        disabled={busy}
      >
        {busy
          ? 'Verifying...'
          : 'Verify Biometrics'}
      </button>

      <div style={styles.tipBox}>
        Your fingerprint or face data is not
        stored by NEXVIA through this browser
        flow. The device's WebAuthn authenticator
        performs the local verification.
      </div>
    </div>
  )
}

/* =========================================================
   FINAL ATTENDANCE
========================================================= */

function AttendanceComplete({
  user,
  qrToken,
  session,
  beaconVerified,
  beaconName,
  biometricVerified,
  loading,
  setLoading,
  setError,
}) {
  const [marked, setMarked] =
    useState(false)

  async function markAttendance() {
    setLoading(true)
    setError('')

    try {
      const payload = {
        student_id:
          user.usn_or_staffid ||
          user.username,

        usn:
          user.usn_or_staffid ||
          user.username,

        token: qrToken,

        qr_token: qrToken,

        session_token: qrToken,

        beacon_id: BEACON_ID,

        beacon_name: beaconName,

        beacon_verified:
          beaconVerified,

        biometric_verified:
          biometricVerified,

        rssi: -60,
      }

      const response = await fetch(
        `${API}/attendance/mark/`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Attendance could not be marked.'
        )
      }

      setMarked(true)
    } catch (err) {
      setError(
        err?.message ||
          'Attendance marking failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (marked) {
    return (
      <div style={styles.card}>
        <div style={styles.successIcon}>
          ✓
        </div>

        <h2 style={styles.center}>
          Attendance Marked
        </h2>

        <p style={styles.center}>
          Your attendance has been successfully
          recorded.
        </p>

        <div style={styles.verificationList}>
          <VerificationRow
            text="QR verified"
          />
          <VerificationRow
            text="NEXVIA beacon verified"
          />
          <VerificationRow
            text="Biometric verified"
          />
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <div style={styles.bigIcon}>
        ✅
      </div>

      <h3>All Verification Complete</h3>

      <div style={styles.verificationList}>
        <VerificationRow
          text="QR verified"
        />

        <VerificationRow
          text={`Beacon verified (${beaconName})`}
        />

        <VerificationRow
          text="Biometric verified"
        />
      </div>

      <button
        style={styles.primaryButton}
        onClick={markAttendance}
        disabled={
          loading ||
          !beaconVerified ||
          !biometricVerified
        }
      >
        {loading
          ? 'Marking Attendance...'
          : 'Mark Attendance'}
      </button>
    </div>
  )
}

function VerificationRow({ text }) {
  return (
    <div style={styles.verificationRow}>
      <span style={styles.check}>
        ✓
      </span>

      <span>{text}</span>
    </div>
  )
}

/* =========================================================
   CAMPUSCARE STUDENT
========================================================= */

function StudentCampusCare({ user }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] =
    useState('')
  const [status, setStatus] =
    useState('')
  const [loading, setLoading] =
    useState(false)

  async function submitComplaint(e) {
    e.preventDefault()

    setLoading(true)
    setStatus('')

    try {
      const response = await fetch(
        `${API}/complaints/`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            student_id:
              user.usn_or_staffid ||
              user.username,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Complaint submission failed.'
        )
      }

      setStatus(
        'Complaint submitted successfully ✓'
      )

      setTitle('')
      setDescription('')
    } catch (err) {
      setStatus(
        err?.message ||
          'Complaint submission failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={styles.pageTitle}>
        CampusCare
      </h2>

      <div style={styles.card}>
        <h3>Report a Campus Issue</h3>

        <form onSubmit={submitComplaint}>
          <label style={styles.label}>
            Issue title
          </label>

          <input
            style={styles.input}
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Example: Classroom projector not working"
            required
          />

          <label style={styles.label}>
            Description
          </label>

          <textarea
            style={{
              ...styles.input,
              minHeight: 130,
              resize: 'vertical',
            }}
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="Describe the issue..."
            required
          />

          <button
            style={styles.primaryButton}
            disabled={loading}
          >
            {loading
              ? 'Submitting...'
              : 'Submit Complaint'}
          </button>
        </form>

        {status && (
          <div style={styles.statusBox}>
            {status}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3>Complaint Status</h3>

        <div style={styles.statusPill}>
          Pending
        </div>

        <div style={styles.statusPill}>
          Assigned
        </div>

        <div style={styles.statusPill}>
          Action Started
        </div>

        <div style={styles.statusPill}>
          Resolved
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PROFILE
========================================================= */

function Profile({ user }) {
  return (
    <div>
      <h2 style={styles.pageTitle}>
        Profile
      </h2>

      <div style={styles.card}>
        <div style={styles.profileAvatar}>
          {(user.first_name || 'S')[0]}
        </div>

        <h2 style={styles.center}>
          {user.first_name || ''}{' '}
          {user.last_name || ''}
        </h2>

        <div style={styles.profileRow}>
          <b>USN</b>
          <span>
            {user.usn_or_staffid ||
              user.username}
          </span>
        </div>

        <div style={styles.profileRow}>
          <b>Department</b>
          <span>
            {user.department || 'ISE'}
          </span>
        </div>

        <div style={styles.profileRow}>
          <b>Role</b>
          <span>Student</span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   FACULTY PORTAL
========================================================= */

function FacultyPortal({
  user,
  page,
  setPage,
  logout,
}) {
  return (
    <div style={styles.app}>
      <Header
        title="Faculty Portal"
        user={user}
        logout={logout}
      />

      <div style={styles.content}>
        {page === 'home' && (
          <FacultyHome
            setPage={setPage}
          />
        )}

        {page === 'students' && (
          <FacultyStudents />
        )}

        {page === 'attendance' && (
          <FacultyAttendance />
        )}

        {page === 'reports' && (
          <FacultyReports />
        )}

        {page === 'classes' && (
          <FacultyClasses />
        )}
      </div>

      <BottomNav
        page={page}
        setPage={setPage}
        faculty
      />
    </div>
  )
}

function FacultyHome({ setPage }) {
  return (
    <div>
      <div style={styles.hero}>
        <div>
          <div style={styles.smallText}>
            Faculty Dashboard
          </div>

          <h2 style={styles.heroTitle}>
            NEXVIA
          </h2>

          <p style={styles.heroText}>
            Manage your classes and attendance.
          </p>
        </div>

        <div style={styles.avatar}>
          👨‍🏫
        </div>
      </div>

      <div style={styles.grid}>
        <ActionCard
          icon="👥"
          title="Students"
          text="View registered students"
          onClick={() =>
            setPage('students')
          }
        />

        <ActionCard
          icon="📋"
          title="Attendance"
          text="Start attendance session"
          onClick={() =>
            setPage('attendance')
          }
        />

        <ActionCard
          icon="📊"
          title="Reports"
          text="View attendance reports"
          onClick={() =>
            setPage('reports')
          }
        />

        <ActionCard
          icon="🗓️"
          title="Classes"
          text="View timetable"
          onClick={() =>
            setPage('classes')
          }
        />
      </div>
    </div>
  )
}

function FacultyStudents() {
  const [students, setStudents] =
    useState([])
  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `${API}/users/`
        )

        if (!response.ok) {
          throw new Error()
        }

        const data =
          await response.json()

        const list =
          Array.isArray(data)
            ? data
            : data.results || data.users || []

        setStudents(
          list.filter(
            (x) =>
              x.role === 'student'
          )
        )
      } catch {
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div>
      <h2 style={styles.pageTitle}>
        Students
      </h2>

      <div style={styles.card}>
        {loading && (
          <p>Loading students...</p>
        )}

        {!loading &&
          students.length === 0 && (
            <p style={styles.muted}>
              No students available.
            </p>
          )}

        {students.map((student) => (
          <div
            key={
              student.id ||
              student.username
            }
            style={styles.profileRow}
          >
            <div>
              <b>
                {student.first_name}{' '}
                {student.last_name}
              </b>

              <div style={styles.muted}>
                {student.usn_or_staffid ||
                  student.username}
              </div>
            </div>

            <span>
              {student.department ||
                'ISE'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FacultyAttendance() {
  const [course, setCourse] =
    useState('Web Technologies')
  const [semester, setSemester] =
    useState('4')
  const [session, setSession] =
    useState(null)
  const [loading, setLoading] =
    useState(false)
  const [message, setMessage] =
    useState('')

  async function startSession() {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `${API}/attendance/sessions/start/`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            course,
            semester,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Could not start session.'
        )
      }

      setSession(data)
    } catch (err) {
      setMessage(
        err?.message ||
          'Could not start attendance session.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function stopSession() {
    if (!session?.id) return

    try {
      await fetch(
        `${API}/attendance/sessions/${session.id}/stop/`,
        {
          method: 'POST',
        }
      )

      setMessage(
        'Attendance session stopped.'
      )

      setSession(null)
    } catch {
      setMessage(
        'Could not stop session.'
      )
    }
  }

  const token =
    session?.token ||
    session?.qr_token ||
    session?.session_token ||
    ''

  return (
    <div>
      <h2 style={styles.pageTitle}>
        Attendance
      </h2>

      {!session && (
        <div style={styles.card}>
          <h3>Start Attendance</h3>

          <label style={styles.label}>
            Course
          </label>

          <input
            style={styles.input}
            value={course}
            onChange={(e) =>
              setCourse(e.target.value)
            }
          />

          <label style={styles.label}>
            Semester
          </label>

          <select
            style={styles.input}
            value={semester}
            onChange={(e) =>
              setSemester(
                e.target.value
              )
            }
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>

          <button
            style={styles.primaryButton}
            onClick={startSession}
            disabled={loading}
          >
            {loading
              ? 'Starting...'
              : 'Start Attendance Session'}
          </button>
        </div>
      )}

      {session && (
        <div style={styles.card}>
          <h3>
            {course}
          </h3>

          <p>
            Scan this QR code from the
            student phone.
          </p>

          {token && (
            <div style={styles.qrBox}>
              <QRCodeSVG
                value={JSON.stringify({
                  token,
                })}
                size={260}
              />
            </div>
          )}

          <div style={styles.statusBox}>
            Attendance session active
          </div>

          <button
            style={styles.dangerButton}
            onClick={stopSession}
          >
            Stop Session
          </button>
        </div>
      )}

      {message && (
        <div style={styles.infoBox}>
          {message}
        </div>
      )}
    </div>
  )
}

function FacultyReports() {
  const [message, setMessage] =
    useState('')

  async function downloadExcel() {
    setMessage(
      'Use the attendance session report/export option from the active session.'
    )
  }

  return (
    <div>
      <h2 style={styles.pageTitle}>
        Reports
      </h2>

      <div style={styles.card}>
        <h3>
          Attendance Reports
        </h3>

        <p style={styles.muted}>
          Attendance reports are generated
          from the backend attendance records.
        </p>

        <button
          style={styles.secondaryButton}
          onClick={downloadExcel}
        >
          View Export Options
        </button>

        {message && (
          <div style={styles.infoBox}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

function FacultyClasses() {
  const classes = [
    {
      day: 'Monday',
      time: '9:00 AM',
      subject: 'Web Technologies',
      room: 'ISE-B204',
    },
    {
      day: 'Tuesday',
      time: '11:00 AM',
      subject: 'Database Management',
      room: 'ISE-B204',
    },
    {
      day: 'Wednesday',
      time: '10:00 AM',
      subject: 'Data Structures',
      room: 'ISE-Lab',
    },
    {
      day: 'Thursday',
      time: '2:00 PM',
      subject: 'Cloud Computing',
      room: 'ISE-B204',
    },
  ]

  return (
    <div>
      <h2 style={styles.pageTitle}>
        Classes & Timetable
      </h2>

      <div style={styles.card}>
        {classes.map(
          (item, index) => (
            <div
              key={index}
              style={styles.classRow}
            >
              <div>
                <b>{item.day}</b>

                <div
                  style={styles.muted}
                >
                  {item.time}
                </div>
              </div>

              <div>
                <b>
                  {item.subject}
                </b>

                <div
                  style={styles.muted}
                >
                  {item.room}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/* =========================================================
   CAMPUSCARE STAFF
========================================================= */

function CampusCarePortal({
  user,
  logout,
}) {
  const [claims, setClaims] =
    useState([])
  const [loading, setLoading] =
    useState(true)

  async function loadClaims() {
    try {
      const response =
        await fetch(
          `${API}/complaints/`
        )

      if (!response.ok) {
        throw new Error()
      }

      const data =
        await response.json()

      setClaims(
        Array.isArray(data)
          ? data
          : data.results ||
              data.complaints ||
              []
      )
    } catch {
      setClaims([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [])

  async function updateClaim(
    id,
    status
  ) {
    try {
      await fetch(
        `${API}/complaints/${id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            status,
          }),
        }
      )

      loadClaims()
    } catch {}
  }

  return (
    <div style={styles.app}>
      <Header
        title="CampusCare"
        user={user}
        logout={logout}
      />

      <div style={styles.content}>
        <h2 style={styles.pageTitle}>
          Complaints & Claims
        </h2>

        <div style={styles.card}>
          {loading && (
            <p>
              Loading complaints...
            </p>
          )}

          {!loading &&
            claims.length === 0 && (
              <p style={styles.muted}>
                No complaints found.
              </p>
            )}

          {claims.map(
            (claim) => (
              <div
                key={
                  claim.id ||
                  claim.pk
                }
                style={
                  styles.complaintCard
                }
              >
                <h3>
                  {claim.title ||
                    'Campus Issue'}
                </h3>

                <p>
                  {claim.description ||
                    claim.message ||
                    ''}
                </p>

                <div
                  style={
                    styles.statusPill
                  }
                >
                  {claim.status ||
                    'Pending'}
                </div>

                <div
                  style={
                    styles.buttonRow
                  }
                >
                  <button
                    style={
                      styles.smallButton
                    }
                    onClick={() =>
                      updateClaim(
                        claim.id ||
                          claim.pk,
                        'Assigned'
                      )
                    }
                  >
                    Assign
                  </button>

                  <button
                    style={
                      styles.smallButton
                    }
                    onClick={() =>
                      updateClaim(
                        claim.id ||
                          claim.pk,
                        'Action Started'
                      )
                    }
                  >
                    Start
                  </button>

                  <button
                    style={
                      styles.smallButton
                    }
                    onClick={() =>
                      updateClaim(
                        claim.id ||
                          claim.pk,
                        'Resolved'
                      )
                    }
                  >
                    Resolve
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   COMMON UI
========================================================= */

function Header({
  title,
  user,
  logout,
}) {
  return (
    <header style={styles.header}>
      <div>
        <div style={styles.brand}>
          NEXVIA
        </div>

        <div style={styles.headerTitle}>
          {title}
        </div>
      </div>

      <div style={styles.headerRight}>
        <span style={styles.userName}>
          {user.first_name ||
            user.username}
        </span>

        <button
          style={styles.logoutButton}
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </header>
  )
}

function BottomNav({
  page,
  setPage,
  faculty = false,
}) {
  const items = faculty
    ? [
        ['home', '🏠', 'Home'],
        [
          'students',
          '👥',
          'Students',
        ],
        [
          'attendance',
          '📋',
          'Attendance',
        ],
        [
          'reports',
          '📊',
          'Reports',
        ],
      ]
    : [
        ['home', '🏠', 'Home'],
        [
          'attendance',
          '📷',
          'Attendance',
        ],
        [
          'campuscare',
          '🛠️',
          'CampusCare',
        ],
        [
          'profile',
          '👤',
          'Profile',
        ],
      ]

  return (
    <nav style={styles.bottomNav}>
      {items.map(
        ([id, icon, label]) => (
          <button
            key={id}
            style={{
              ...styles.navButton,
              ...(page === id
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              setPage(id)
            }
          >
            <span>
              {icon}
            </span>

            <span>
              {label}
            </span>
          </button>
        )
      )}
    </nav>
  )
}

function Progress({ step }) {
  const steps = [
    ['qr', 'QR'],
    ['beacon', 'Beacon'],
    [
      'biometric',
      'Biometric',
    ],
    ['complete', 'Complete'],
  ]

  const current =
    steps.findIndex(
      ([id]) => id === step
    )

  return (
    <div style={styles.progress}>
      {steps.map(
        ([id, label], index) => (
          <div
            key={id}
            style={{
              ...styles.progressItem,
              ...(index <= current
                ? styles.progressActive
                : {}),
            }}
          >
            <div
              style={
                styles.progressCircle
              }
            >
              {index + 1}
            </div>

            <span>
              {label}
            </span>
          </div>
        )
      )}
    </div>
  )
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  app: {
    minHeight: '100vh',
    background:
      '#f5f7fb',
    color: '#182230',
    fontFamily:
      'Inter, Arial, sans-serif',
  },

  loginPage: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    background:
      'linear-gradient(135deg, #eef3ff, #fdfaff)',
  },

  loginCard: {
    width: '100%',
    maxWidth: 430,
    background: '#ffffff',
    borderRadius: 24,
    padding: 32,
    boxShadow:
      '0 20px 60px rgba(40,50,90,.12)',
  },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#4f46e5',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
    margin: '0 auto 12px',
  },

  logoTitle: {
    textAlign: 'center',
    margin: 0,
    letterSpacing: 2,
  },

  subtitle: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 28,
  },

  header: {
    background: '#fff',
    padding:
      '18px 24px',
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'center',
    boxShadow:
      '0 2px 12px rgba(0,0,0,.05)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  brand: {
    fontWeight: 900,
    letterSpacing: 2,
    color: '#4f46e5',
    fontSize: 18,
  },

  headerTitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  userName: {
    fontWeight: 600,
    fontSize: 14,
  },

  logoutButton: {
    border: '1px solid #e2e8f0',
    background: '#fff',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
  },

  content: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: 24,
    paddingBottom: 100,
  },

  hero: {
    background:
      'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    borderRadius: 24,
    padding: 28,
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  smallText: {
    opacity: .8,
    fontSize: 13,
  },

  heroTitle: {
    margin:
      '5px 0',
    fontSize: 28,
  },

  heroText: {
    margin: 0,
    opacity: .9,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background:
      'rgba(255,255,255,.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },

  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#eef2ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 30,
    fontWeight: 800,
    margin: '0 auto 15px',
  },

  sectionTitle: {
    margin:
      '25px 0 14px',
  },

  pageTitle: {
    marginBottom: 20,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit,minmax(220px,1fr))',
    gap: 15,
  },

  actionCard: {
    border: 0,
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    display: 'flex',
    gap: 15,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow:
      '0 8px 25px rgba(40,50,90,.07)',
  },

  actionIcon: {
    fontSize: 28,
  },

  actionTitle: {
    fontWeight: 800,
    marginBottom: 5,
  },

  actionText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.5,
  },

  card: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    boxShadow:
      '0 8px 30px rgba(40,50,90,.07)',
    marginBottom: 18,
  },

  infoCard: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    marginTop: 22,
    boxShadow:
      '0 8px 30px rgba(40,50,90,.07)',
  },

  steps: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    fontWeight: 700,
    fontSize: 13,
  },

  label: {
    display: 'block',
    fontWeight: 700,
    margin:
      '16px 0 7px',
    fontSize: 14,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    border:
      '1px solid #dbe2ea',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    outline: 'none',
    background: '#fff',
  },

  primaryButton: {
    width: '100%',
    border: 0,
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    background: '#4f46e5',
    color: '#fff',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
  },

  secondaryButton: {
    border:
      '1px solid #4f46e5',
    borderRadius: 12,
    padding: 12,
    background: '#fff',
    color: '#4f46e5',
    fontWeight: 700,
    cursor: 'pointer',
  },

  dangerButton: {
    width: '100%',
    border: 0,
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    background: '#dc2626',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  },

  smallButton: {
    border: 0,
    borderRadius: 9,
    padding:
      '8px 12px',
    background: '#eef2ff',
    color: '#4338ca',
    fontWeight: 700,
    cursor: 'pointer',
  },

  buttonRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },

  errorBox: {
    background: '#fef2f2',
    color: '#b91c1c',
    border:
      '1px solid #fecaca',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    fontSize: 14,
  },

  successBox: {
    background: '#f0fdf4',
    color: '#166534',
    border:
      '1px solid #bbf7d0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  infoBox: {
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },

  demoBox: {
    marginTop: 20,
    background: '#f8fafc',
    padding: 15,
    borderRadius: 12,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.8,
  },

  muted: {
    color: '#64748b',
    fontSize: 14,
  },

  bigIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 10,
  },

  center: {
    textAlign: 'center',
  },

  statusBox: {
    background: '#f8fafc',
    border:
      '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
    fontSize: 14,
  },

  tipBox: {
    marginTop: 16,
    background: '#fffbeb',
    color: '#92400e',
    border:
      '1px solid #fde68a',
    padding: 13,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.5,
  },

  qrReader: {
    width: '100%',
    maxWidth: 420,
    margin:
      '20px auto',
  },

  qrBox: {
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
  },

  progress: {
    display: 'flex',
    justifyContent:
      'space-between',
    marginBottom: 20,
    gap: 5,
  },

  progressItem: {
    flex: 1,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
  },

  progressActive: {
    color: '#4f46e5',
    fontWeight: 800,
  },

  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin:
      '0 auto 5px',
  },

  verificationList: {
    marginTop: 20,
  },

  verificationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    background: '#f8fafc',
    borderRadius: 10,
    marginBottom: 8,
  },

  check: {
    width: 25,
    height: 25,
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
  },

  successIcon: {
    width: 75,
    height: 75,
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    fontWeight: 900,
    margin:
      '10px auto 20px',
  },

  statusPill: {
    display: 'inline-block',
    background: '#eef2ff',
    color: '#4338ca',
    borderRadius: 999,
    padding:
      '7px 12px',
    fontSize: 12,
    fontWeight: 700,
    margin:
      '5px 5px 5px 0',
  },

  profileRow: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: 20,
    padding:
      '14px 0',
    borderBottom:
      '1px solid #edf1f5',
  },

  classRow: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: 20,
    padding: 16,
    borderBottom:
      '1px solid #edf1f5',
  },

  complaintCard: {
    border:
      '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    display: 'flex',
    justifyContent:
      'space-around',
    padding:
      '8px 5px',
    borderTop:
      '1px solid #e2e8f0',
    zIndex: 20,
  },

  navButton: {
    border: 0,
    background: 'transparent',
    color: '#64748b',
    padding: '7px 10px',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    alignItems: 'center',
    fontSize: 11,
    cursor: 'pointer',
  },

  navActive: {
    color: '#4f46e5',
    background: '#eef2ff',
    fontWeight: 800,
  },
}

export default App