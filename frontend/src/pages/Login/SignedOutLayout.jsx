import styles from './Login.module.css'

/**
 * The frame both signed-out pages share: the wordmark and the page's title, centred, with its fields underneath.
 * It doesn't use AppShell: there's nothing to navigate to until someone logs in.
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
