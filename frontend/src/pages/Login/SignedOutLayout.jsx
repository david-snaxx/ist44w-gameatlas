import styles from './Login.module.css'

/**
 * The frame both signed-out pages share: the GameAtlas wordmark and a line saying what the page is
 * for, centred on an empty screen, with the page's own fields and buttons underneath.
 *
 * It deliberately doesn't use AppShell: there's nothing to navigate to until someone logs in.
 */
function SignedOutLayout({ title, children }) {
  return (
    <main className={styles.screen}>
      <div className={styles.column}>
        <p className={styles.brand}>GameAtlas</p>
        <p className={styles.title}>{title}</p>
        {children}
      </div>
    </main>
  )
}

export default SignedOutLayout
