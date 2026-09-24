import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'

/** Any URL that doesn't match a route. */
function NotFoundPage() {
  return (
    <MissingRecord title="Page not found" message="This page doesn't exist." back={{ to: '/', label: 'Go home' }} />
  )
}

export default NotFoundPage
