import Section from '../../components/Section/Section.jsx'
import styles from './Showcase.module.css'

function ShowcaseSection({ id, title, intro, actions, children }) {
  return (
    <Section id={id} title={title} actions={actions} className={styles.section}>
      {intro && <p className={styles.sectionIntro}>{intro}</p>}
      <div className={styles.sectionBody}>{children}</div>
    </Section>
  )
}

export default ShowcaseSection
