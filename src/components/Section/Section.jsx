import { cx } from '../../utils/cx.js'

/**
 * A flat piece of a page. There is no card, background or outline: a section is just
 * a titled block separated from its neighbours by rules (STYLE-GUIDELINES §6.1).
 *
 * title/actions build the optional header (a label above a rule); footer adds a bar
 * above a rule under the body (e.g. Save and Cancel buttons that should stay visible
 * while the body scrolls).
 */
function Section({ title, actions, footer, children, className, bodyClassName, ...props }) {
  return (
    <section className={cx('section', className)} {...props}>
      {(title || actions) && (
        <header className="section-head">
          {title && <h2 className="section-title">{title}</h2>}
          {actions && <div className="section-actions">{actions}</div>}
        </header>
      )}
      <div className={cx('section-body', bodyClassName)}>{children}</div>
      {footer && <footer className="section-foot">{footer}</footer>}
    </section>
  )
}

export default Section
