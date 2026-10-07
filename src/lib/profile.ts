export function getInitials(email: string | undefined) {
  return email ? email.slice(0, 2).toUpperCase() : 'GM'
}
