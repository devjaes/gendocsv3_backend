export const getWhatsAppLink = ({ studentPhoneNumber, message }) => {
  const phone = studentPhoneNumber.replace(/[^0-9]/g, '')

  const encodedMessage = encodeURIComponent(message)

  const whatsappLink = `https://wa.me/${
    phone.startsWith('593') ? phone : `593${phone}`
  }?text=${encodedMessage}`

  return whatsappLink
}
