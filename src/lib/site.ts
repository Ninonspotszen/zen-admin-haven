// Adresse principale du site (spotszen.fr redirige vers www) : utilisée dans les QR codes imprimés.
export const SITE_URL = "https://www.spotszen.fr";
export const spotPublicUrl = (spotId: string) => `${SITE_URL}/spots/${spotId}`;
