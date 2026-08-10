import { useEffect } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  Cloud,
  Download,
  ExternalLink,
  KeyRound,
  Laptop,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Usb,
  Wifi
} from 'lucide-react'
import HomeLayout from '../../components/layout/HomeLayout'
import AppleIcon from '../../components/common/AppleIcon'
import '../../assets/style/common/ios-install-guide.css'

const IPA_URL = 'https://pub-a7dc2066b937452cb00d7263b29ee9e5.r2.dev/ComiVerse-unsigned.ipa'
const ITUNES_WEB_64_URL = 'https://www.apple.com/itunes/download/win64'
const ICLOUD_WEB_URL = 'https://updates.cdn-apple.com/2020/windows/001-39935-20200911-1A70AA56-F448-11EA-8CC0-99D41950005E/iCloudSetup.exe'
const SIDELOADLY_WINDOWS_URL = 'https://sideloadly.io/SideloadlySetup64.exe'

const ResourceLink = ({ href, icon: Icon, eyebrow, title }) => (
  <a className="ios-guide-resource" href={href} target="_blank" rel="noopener noreferrer">
    <span className="ios-guide-resource-icon" aria-hidden="true">
      <Icon size={21} />
    </span>
    <span>
      <small>{eyebrow}</small>
      <strong>{title}</strong>
    </span>
    <ExternalLink size={16} aria-hidden="true" />
  </a>
)

function IosInstallGuide() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Install ComiVerse on iPhone'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <HomeLayout>
      <div className="ios-guide-page">
        <section className="ios-guide-hero" aria-labelledby="ios-guide-title">
          <div className="ios-guide-hero-copy">
            <div className="ios-guide-kicker">
              <AppleIcon size={17} aria-hidden="true" />
              ComiVerse for iOS
            </div>
            <h1 id="ios-guide-title">Install ComiVerse on your iPhone</h1>
            <p>
              The current iOS build is an unsigned IPA, so it cannot be installed by tapping the file directly.
              Follow this Windows and Sideloadly guide to sign it with your own Apple ID and install it safely.
            </p>
            <div className="ios-guide-tags" aria-label="Installation requirements">
              <span><Laptop size={15} /> Windows PC</span>
              <span><Usb size={15} /> USB cable</span>
              <span><ShieldCheck size={15} /> No jailbreak</span>
            </div>
          </div>
          <div className="ios-guide-hero-art" aria-hidden="true">
            <div className="ios-guide-phone">
              <AppleIcon size={44} />
              <strong>ComiVerse</strong>
              <span>iOS</span>
            </div>
          </div>
        </section>

        <div className="ios-guide-notice ios-guide-notice--warning">
          <CircleAlert size={22} aria-hidden="true" />
          <div>
            <strong>Before you begin</strong>
            <p>
              On Windows, Sideloadly requires the web versions of iTunes and iCloud. If either app was installed
              from the Microsoft Store, uninstall it before continuing.
            </p>
          </div>
        </div>

        <div className="ios-guide-layout">
          <main className="ios-guide-content">
            <section className="ios-guide-section" aria-labelledby="prepare-windows">
              <div className="ios-guide-section-heading">
                <span className="ios-guide-step-number">1</span>
                <div>
                  <span className="ios-guide-section-label">Prepare your PC</span>
                  <h2 id="prepare-windows">Install Apple drivers and Sideloadly</h2>
                </div>
              </div>

              <ol className="ios-guide-checklist">
                <li>
                  <CheckCircle2 size={19} />
                  <span>Uninstall the Microsoft Store versions of <strong>iTunes</strong> and <strong>iCloud</strong>, if present.</span>
                </li>
                <li>
                  <CheckCircle2 size={19} />
                  <span>Install <strong>Web iTunes 64-bit</strong>, then install <strong>Web iCloud</strong>.</span>
                </li>
                <li>
                  <CheckCircle2 size={19} />
                  <span>Restart Windows so the Apple device drivers are loaded correctly.</span>
                </li>
                <li>
                  <CheckCircle2 size={19} />
                  <span>Install the 64-bit Windows version of Sideloadly.</span>
                </li>
              </ol>

              <div className="ios-guide-resource-grid">
                <ResourceLink href={ITUNES_WEB_64_URL} icon={Download} eyebrow="Step 1" title="Web iTunes 64-bit" />
                <ResourceLink href={ICLOUD_WEB_URL} icon={Cloud} eyebrow="Step 2" title="Web iCloud" />
                <ResourceLink href={SIDELOADLY_WINDOWS_URL} icon={Laptop} eyebrow="After restarting" title="Download Sideloadly" />
              </div>

              <p className="ios-guide-source-note">
                These are the Windows download links currently published by the official{' '}
                <a href="https://sideloadly.io/" target="_blank" rel="noopener noreferrer">Sideloadly website</a>.
              </p>
            </section>

            <section className="ios-guide-section" aria-labelledby="connect-iphone">
              <div className="ios-guide-section-heading">
                <span className="ios-guide-step-number">2</span>
                <div>
                  <span className="ios-guide-section-label">Connect your iPhone</span>
                  <h2 id="connect-iphone">Let Windows recognize the device</h2>
                </div>
              </div>

              <div className="ios-guide-action-grid">
                <article>
                  <Usb size={22} />
                  <h3>Connect by USB</h3>
                  <p>Unlock your iPhone, connect it to the PC, and tap <strong>Trust This Computer</strong> if prompted.</p>
                </article>
                <article>
                  <Smartphone size={22} />
                  <h3>Open iTunes once</h3>
                  <p>Confirm that your iPhone appears in iTunes before opening Sideloadly.</p>
                </article>
              </div>

              <div className="ios-guide-notice">
                <RefreshCw size={20} aria-hidden="true" />
                <p>
                  If Sideloadly shows <strong>No devices detected</strong>, reinstall the web versions of iTunes and iCloud,
                  restart Windows, reconnect the cable, unlock the iPhone, and tap Trust again.
                </p>
              </div>
            </section>

            <section className="ios-guide-section" aria-labelledby="install-comiverse">
              <div className="ios-guide-section-heading">
                <span className="ios-guide-step-number">3</span>
                <div>
                  <span className="ios-guide-section-label">Sideload the app</span>
                  <h2 id="install-comiverse">Sign and install the ComiVerse IPA</h2>
                </div>
              </div>

              <a className="ios-guide-ipa-button" href={IPA_URL} target="_blank" rel="noopener noreferrer">
                <Download size={21} />
                <span>
                  <small>Download installation file</small>
                  <strong>ComiVerse-unsigned.ipa</strong>
                </span>
              </a>

              <div className="ios-guide-flow" aria-label="Sideloadly installation flow">
                <div><Download size={19} /><span>Download the IPA</span></div>
                <span className="ios-guide-flow-arrow">→</span>
                <div><Laptop size={19} /><span>Drag it into Sideloadly</span></div>
                <span className="ios-guide-flow-arrow">→</span>
                <div><KeyRound size={19} /><span>Enter your Apple ID</span></div>
                <span className="ios-guide-flow-arrow">→</span>
                <div><Smartphone size={19} /><span>Select iPhone and Start</span></div>
              </div>

              <div className="ios-guide-notice ios-guide-notice--security">
                <ShieldCheck size={21} aria-hidden="true" />
                <div>
                  <strong>Apple ID safety</strong>
                  <p>Only use the official Sideloadly installer. Never enter your Apple ID on an unknown website or share it with another person.</p>
                </div>
              </div>

              <div className="ios-guide-notice ios-guide-notice--info">
                <RefreshCw size={21} aria-hidden="true" />
                <div>
                  <strong>Free Apple ID: 7-day signing period</strong>
                  <p>
                    Apps signed with a free Apple developer account normally remain valid for 7 days. Re-sign or refresh
                    ComiVerse with the same Apple ID before it expires. Sideloadly can auto-refresh when the PC can see your device.
                  </p>
                </div>
              </div>
            </section>

            <section className="ios-guide-section" aria-labelledby="trust-app">
              <div className="ios-guide-section-heading">
                <span className="ios-guide-step-number">4</span>
                <div>
                  <span className="ios-guide-section-label">Approve the developer</span>
                  <h2 id="trust-app">Fix “Untrusted Developer”</h2>
                </div>
              </div>

              <div className="ios-guide-settings-path">
                <span>Settings</span><span>General</span><span>VPN &amp; Device Management</span><span>Developer App / Apple ID</span><span>Trust or Verify App</span>
              </div>

              <ul className="ios-guide-detail-list">
                <li>
                  <Settings size={19} />
                  <span>Find the Apple ID used in Sideloadly under <strong>Developer App</strong>, open it, then choose <strong>Trust</strong> or <strong>Verify App</strong>.</span>
                </li>
                <li>
                  <RefreshCw size={19} />
                  <span>If iOS shows <strong>Allow &amp; Restart</strong>, accept it, let the iPhone restart, and follow the on-screen instructions.</span>
                </li>
                <li>
                  <Wifi size={19} />
                  <span>If the app is <strong>Not Verified</strong>, connect to Wi-Fi or mobile data and return to the Developer App screen to verify it.</span>
                </li>
              </ul>
            </section>

            <section className="ios-guide-section" aria-labelledby="developer-mode">
              <div className="ios-guide-section-heading">
                <span className="ios-guide-step-number">5</span>
                <div>
                  <span className="ios-guide-section-label">Only when requested</span>
                  <h2 id="developer-mode">Enable Developer Mode</h2>
                </div>
              </div>

              <p className="ios-guide-paragraph">
                If iPhone says Developer Mode is required, go to <strong>Settings → Privacy &amp; Security → Developer Mode</strong>,
                turn it on, restart the device, confirm the prompt after restart, and open ComiVerse again.
              </p>

              <div className="ios-guide-notice ios-guide-notice--success">
                <CheckCircle2 size={21} aria-hidden="true" />
                <p>
                  If ComiVerse opens, installation is complete. If the trust and Developer Mode steps are complete but the app
                  immediately closes, that indicates a ComiVerse build/runtime issue rather than an Untrusted Developer issue.
                </p>
              </div>
            </section>
          </main>

          <aside className="ios-guide-summary" aria-label="Installation checklist">
            <div className="ios-guide-summary-card">
              <span className="ios-guide-summary-icon"><AppleIcon size={24} /></span>
              <h2>Installation checklist</h2>
              <ol>
                <li><span>1</span>Install web iTunes and iCloud</li>
                <li><span>2</span>Restart Windows</li>
                <li><span>3</span>Install Sideloadly</li>
                <li><span>4</span>Connect and trust the iPhone</li>
                <li><span>5</span>Download and sideload the IPA</li>
                <li><span>6</span>Trust the developer on iOS</li>
              </ol>
              <a href={IPA_URL} target="_blank" rel="noopener noreferrer">
                <Download size={17} /> Download ComiVerse IPA
              </a>
              <p>Unsigned iOS build · manual installation required</p>
            </div>
          </aside>
        </div>
      </div>
    </HomeLayout>
  )
}

export default IosInstallGuide
