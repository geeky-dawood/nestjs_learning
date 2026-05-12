import i18next from 'i18next';

import en from '../../i18n/en/translation.json';
import es from '../../i18n/es/translation.json';
import fr from '../../i18n/fr/translation.json';

export async function initI18n() {
  await i18next.init({
    fallbackLng: 'en',

    resources: {
      en: {
        translation: en,
      },

      es: {
        translation: es,
      },

      fr: {
        translation: fr,
      },
    },
  });
}
