/**
 * app.js — Sistema de Reseñas Dinámicas · Donatostudio Barbería
 * Stack: Vanilla JS (ES Module) + Supabase CDN vía esm.sh
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  CONFIGURACIÓN OBLIGATORIA                                   │
 * │  Reemplaza los dos valores de abajo con los de tu proyecto   │
 * │  en Supabase → Settings → API                                │
 * └─────────────────────────────────────────────────────────────┘
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://TU_PROJECT_ID.supabase.co';   // ← reemplazar
const SUPABASE_ANON = 'TU_ANON_PUBLIC_KEY';                  // ← reemplazar

// ─────────────────────────────────────────────────────────────────
// 1. INICIALIZACIÓN DEL CLIENTE
// ─────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);


// ─────────────────────────────────────────────────────────────────
// 2. REFERENCIAS AL DOM
// ─────────────────────────────────────────────────────────────────
const authPanel        = document.getElementById('auth-panel');
const reviewPanel      = document.getElementById('review-panel');
const btnGoogleLogin   = document.getElementById('btn-google-login');
const btnMagicLink     = document.getElementById('btn-magic-link');
const magicLinkEmail   = document.getElementById('magic-link-email');
const authMessage      = document.getElementById('auth-message');
const btnLogout        = document.getElementById('btn-logout');
const userEmailDisplay = document.getElementById('user-email-display');
const btnSubmit        = document.getElementById('btn-submit-review');
const reviewMessage    = document.getElementById('review-message');
const reviewsGrid      = document.getElementById('reviews-grid');
const starContainer    = document.getElementById('star-rating');
const hiddenRating     = document.getElementById('review-rating');


// ─────────────────────────────────────────────────────────────────
// 3. COMPONENTE DE ESTRELLAS INTERACTIVO
// ─────────────────────────────────────────────────────────────────
/**
 * Renderiza 5 estrellas clicables dentro de #star-rating.
 * El valor seleccionado se almacena en el input oculto #review-rating.
 */
function renderStars(selected = 5) {
  starContainer.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('button');
    star.type = 'button';
    star.setAttribute('aria-label', `${i} estrella${i > 1 ? 's' : ''}`);
    star.className = [
      'w-7 h-7 transition-colors duration-150 focus:outline-none',
      i <= selected ? 'text-barber-gold' : 'text-gray-700',
    ].join(' ');
    star.innerHTML = `<svg class="w-full h-full fill-current" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0
        00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0
        00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1
        1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
        1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1
        0 00.951-.69l1.07-3.292z"/>
    </svg>`;
    star.addEventListener('click', () => {
      hiddenRating.value = i;
      renderStars(i);
    });
    starContainer.appendChild(star);
  }
}

renderStars(5); // Estado inicial: 5 estrellas


// ─────────────────────────────────────────────────────────────────
// 4. HELPERS DE UI
// ─────────────────────────────────────────────────────────────────
/** Muestra el panel correcto según si hay sesión activa o no. */
function syncUI(session) {
  if (session) {
    authPanel.classList.add('hidden');
    reviewPanel.classList.remove('hidden');
    // Mostramos solo el email del usuario (nunca el nombre de Google)
    userEmailDisplay.textContent = session.user.email;
  } else {
    authPanel.classList.remove('hidden');
    reviewPanel.classList.add('hidden');
  }
}

/** Muestra un mensaje de estado bajo un elemento. */
function showMsg(el, text, isError = false) {
  el.textContent  = text;
  el.className    = `mt-3 text-xs text-center ${isError ? 'text-red-400' : 'text-green-400'}`;
  el.classList.remove('hidden');
}

/** Genera las iniciales de un nombre para el avatar. */
function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

/** SVG estrella rellena (para las cards renderizadas). */
const STAR_SVG = `<svg class="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0
    00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0
    00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1
    1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
    1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1
    0 00.951-.69l1.07-3.292z"/>
</svg>`;


// ─────────────────────────────────────────────────────────────────
// 5. RENDERIZADO DE RESEÑAS APROBADAS (SELECT)
// ─────────────────────────────────────────────────────────────────
/**
 * Obtiene todas las reseñas con status = 'approved' y las inyecta
 * en #reviews-grid como <figure>, respetando el mismo markup y
 * clases Tailwind que las cards estáticas originales.
 */
async function loadApprovedReviews() {
  // Limpiamos solo los <figure> dinámicos previos (los que tienen data-dynamic)
  reviewsGrid
    .querySelectorAll('figure[data-dynamic]')
    .forEach(el => el.remove());

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('display_name, content, rating, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Donatostudio] Error cargando reseñas:', error.message);
    return;
  }

  reviews.forEach(review => {
    const name     = review.display_name || 'Anónimo';
    const initials = getInitials(name);
    const stars    = Array.from({ length: 5 }, (_, i) => {
      const active = i < review.rating;
      return `<span class="${active ? 'text-barber-gold' : 'text-gray-700'}">${STAR_SVG}</span>`;
    }).join('');

    const figure = document.createElement('figure');
    figure.setAttribute('data-dynamic', 'true');
    figure.className = [
      'bg-barber-dark border border-gray-800 p-6 sm:p-8 rounded-sm',
      'hover:border-barber-gold transition-all duration-500',
      'transform hover:-translate-y-1 shadow-xl',
      'animate-[fadeInUp_0.6s_ease-out_forwards]',
    ].join(' ');

    // Escapamos el contenido del usuario para evitar XSS
    const safeContent = review.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const safeName = name
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    figure.innerHTML = `
      <div class="flex gap-0.5 text-barber-gold mb-3 sm:mb-4"
           aria-label="${review.rating} de 5 estrellas">
        ${stars}
      </div>
      <blockquote>
        <p class="text-xs sm:text-sm text-gray-300 mb-4 sm:mb-6 italic">"${safeContent}"</p>
      </blockquote>
      <figcaption class="flex items-center">
        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center
                    justify-center text-white font-bold font-serif text-sm"
             aria-hidden="true">${initials}</div>
        <cite class="ml-3 not-italic">
          <p class="text-white font-bold text-xs sm:text-sm">${safeName}</p>
        </cite>
      </figcaption>`;

    reviewsGrid.appendChild(figure);
  });
}


// ─────────────────────────────────────────────────────────────────
// 6. AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────

/** 6a. Login con Google OAuth (1 clic) */
btnGoogleLogin.addEventListener('click', async () => {
  btnGoogleLogin.disabled = true;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirige de vuelta a la misma página tras el login
      redirectTo: window.location.href,
    },
  });
  if (error) {
    showMsg(authMessage, `Error: ${error.message}`, true);
    btnGoogleLogin.disabled = false;
  }
  // Si no hay error, el navegador redirige a Google automáticamente
});

/** 6b. Login con Magic Link (email) */
btnMagicLink.addEventListener('click', async () => {
  const email = magicLinkEmail.value.trim();
  if (!email) {
    showMsg(authMessage, 'Ingresa tu correo para continuar.', true);
    return;
  }

  btnMagicLink.disabled    = true;
  btnMagicLink.textContent = '...';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  });

  if (error) {
    showMsg(authMessage, `Error: ${error.message}`, true);
  } else {
    showMsg(authMessage, `¡Link enviado! Revisa tu correo ${email}.`);
    magicLinkEmail.value = '';
  }

  btnMagicLink.disabled    = false;
  btnMagicLink.textContent = 'Enviar link';
});

/** 6c. Cerrar sesión */
btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

/**
 * 6d. Escucha cambios de sesión.
 * Supabase dispara 'SIGNED_IN' automáticamente cuando el usuario
 * vuelve de la redirección de Google o hace clic en el Magic Link.
 */
supabase.auth.onAuthStateChange((_event, session) => {
  syncUI(session);
});


// ─────────────────────────────────────────────────────────────────
// 7. ENVÍO DE RESEÑA (INSERT)
// ─────────────────────────────────────────────────────────────────
/**
 * Construye el payload EXACTO definido en el Contrato de Datos §3-A.
 * user_id, status y created_at los maneja Supabase automáticamente;
 * el frontend SOLO envía: display_name, content, rating.
 */
btnSubmit.addEventListener('click', async () => {
  const content     = document.getElementById('review-content').value.trim();
  const displayName = document.getElementById('review-display-name').value.trim();
  const rating      = parseInt(hiddenRating.value, 10);

  // Validaciones básicas (la BD también las aplica como constraints)
  if (content.length < 3) {
    showMsg(reviewMessage, 'La reseña debe tener al menos 3 caracteres.', true);
    return;
  }
  if (rating < 1 || rating > 5) {
    showMsg(reviewMessage, 'Selecciona una calificación entre 1 y 5 estrellas.', true);
    return;
  }

  btnSubmit.disabled    = true;
  btnSubmit.textContent = 'Enviando...';

  // ── PAYLOAD EXACTO DEL CONTRATO ──────────────────────────────
  const payload = {
    display_name: displayName || 'Anónimo', // si el campo está vacío → 'Anónimo'
    content,
    rating,
  };
  // ─────────────────────────────────────────────────────────────

  const { error } = await supabase.from('reviews').insert(payload);

  if (error) {
    showMsg(reviewMessage, `No se pudo enviar: ${error.message}`, true);
  } else {
    showMsg(reviewMessage, '¡Gracias! Tu reseña será publicada tras ser aprobada.');
    // Limpiamos el formulario
    document.getElementById('review-content').value       = '';
    document.getElementById('review-display-name').value  = '';
    renderStars(5);
  }

  btnSubmit.disabled    = false;
  btnSubmit.textContent = 'Enviar reseña';
});


// ─────────────────────────────────────────────────────────────────
// 8. INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────────
(async () => {
  // Verificamos si ya hay una sesión activa (ej: usuario regresa con Magic Link)
  const { data: { session } } = await supabase.auth.getSession();
  syncUI(session);

  // Cargamos las reseñas aprobadas al cargar la página
  await loadApprovedReviews();
})();