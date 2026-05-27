/**
 * app.js — Sistema de Reseñas Dinámicas · Donatostudio Barbería
 * v2.0 — Producción lista
 *
 * Cambios vs v1:
 *  - Supabase fijado a @2.45.4 (compatible con key formato sb_publishable__)
 *  - pointer-events-none en submit (fix doble-tap mobile)
 *  - Skeleton loader en loadApprovedReviews()
 *  - Animación fadeInUp protegida del AOS override del HTML
 *  - onAuthStateChange con guard para evento INITIAL_SESSION
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ─────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — tus credenciales de Supabase
// ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://skmeijhahrdovivtqpgo.supabase.co';
const SUPABASE_ANON = 'sb_publishable__qSerIH-2GFNLmx8kOIrHg_GeYy7kib';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);


// ─────────────────────────────────────────────────────────────────
// REFERENCIAS AL DOM
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
const loadMoreContainer = document.getElementById('load-more-container');
const btnLoadMore       = document.getElementById('btn-load-more');
const starContainer    = document.getElementById('star-rating');
const hiddenRating     = document.getElementById('review-rating');


// ─────────────────────────────────────────────────────────────────
// ESTRELLAS INTERACTIVAS
// ─────────────────────────────────────────────────────────────────
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

renderStars(5);


// ─────────────────────────────────────────────────────────────────
// HELPERS DE UI
// ─────────────────────────────────────────────────────────────────
function syncUI(session) {
  if (session) {
    authPanel.classList.add('hidden');
    reviewPanel.classList.remove('hidden');
    userEmailDisplay.textContent = session.user.email;
  } else {
    authPanel.classList.remove('hidden');
    reviewPanel.classList.add('hidden');
  }
}

function showMsg(el, text, isError = false) {
  el.textContent = text;
  el.className   = `mt-3 text-xs text-center ${isError ? 'text-red-400' : 'text-green-400'}`;
  el.classList.remove('hidden');
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

const STAR_SVG = `<svg class="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0
    00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0
    00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1
    1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
    1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1
    0 00.951-.69l1.07-3.292z"/>
</svg>`;

/** Bloquea el botón durante loading (fix doble-tap en iOS). */
function setSubmitLoading(isLoading) {
  btnSubmit.disabled = isLoading;
  // pointer-events-none previene el doble-tap en móviles viejos
  btnSubmit.classList.toggle('pointer-events-none', isLoading);
  btnSubmit.textContent = isLoading ? 'Enviando...' : 'Enviar reseña';
}


// ─────────────────────────────────────────────────────────────────
// RENDERIZADO DE RESEÑAS APROBADAS (SELECT)
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// RENDERIZADO Y PAGINACIÓN DE RESEÑAS
// ─────────────────────────────────────────────────────────────────
let todasLasResenas = [];
let resenasVisibles = 3; // Cuántas mostramos inicialmente

async function loadApprovedReviews() {
  reviewsGrid.innerHTML = '';
  loadMoreContainer.classList.add('hidden');

  // SKELETON LOADER
  const skeleton = document.createElement('div');
  skeleton.id = 'reviews-skeleton';
  skeleton.className = 'col-span-full flex justify-center gap-6 py-4';
  skeleton.innerHTML = `
    <div class="flex items-center gap-2 text-gray-600 text-xs animate-pulse">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Cargando reseñas...
    </div>`;
  reviewsGrid.appendChild(skeleton);

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('display_name, content, rating, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  document.getElementById('reviews-skeleton')?.remove();

  if (error) {
    console.error('[Donatostudio] Error cargando reseñas:', error.message);
    return;
  }

  todasLasResenas = reviews;
  renderizarResenasVisibles();
}

function renderizarResenasVisibles() {
  // Limpiamos la grilla para pintarla de nuevo
  reviewsGrid.innerHTML = '';
  
  // Cortamos el array para mostrar solo la cantidad permitida
  const resenasAMostrar = todasLasResenas.slice(0, resenasVisibles);

  resenasAMostrar.forEach((review, index) => {
    const name     = review.display_name || 'Anónimo';
    const initials = getInitials(name);
    const stars    = Array.from({ length: 5 }, (_, i) => {
      const active = i < review.rating;
      return `<span class="${active ? 'text-barber-gold' : 'text-gray-700'}">${STAR_SVG}</span>`;
    }).join('');

    const safeContent = review.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const safeName    = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const figure = document.createElement('figure');
    figure.style.opacity    = '0';
    figure.style.transform  = 'translateY(15px)';
    figure.style.animation  = `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`;
    figure.className = 'bg-barber-dark border border-gray-800 p-6 sm:p-8 rounded-sm hover:border-barber-gold transition-all duration-500 transform hover:-translate-y-1 shadow-xl';

    figure.innerHTML = `
      <div class="flex gap-0.5 mb-3 sm:mb-4" aria-label="${review.rating} de 5 estrellas">
        ${stars}
      </div>
      <blockquote>
        <p class="text-xs sm:text-sm text-gray-300 mb-4 sm:mb-6 italic">"${safeContent}"</p>
      </blockquote>
      <figcaption class="flex items-center">
        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold font-serif text-sm" aria-hidden="true">${initials}</div>
        <cite class="ml-3 not-italic">
          <p class="text-white font-bold text-xs sm:text-sm">${safeName}</p>
        </cite>
      </figcaption>`;

    reviewsGrid.appendChild(figure);
  });

  // Mostramos u ocultamos el botón de "Ver más" si quedan reseñas
  if (todasLasResenas.length > resenasVisibles) {
    loadMoreContainer.classList.remove('hidden');
  } else {
    loadMoreContainer.classList.add('hidden');
  }
}
  // ─────────────────────────────────────────────────────────────

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('display_name, content, rating, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  // Siempre quitamos el skeleton antes de continuar
  document.getElementById('reviews-skeleton')?.remove();

  if (error) {
    console.error('[Donatostudio] Error cargando reseñas:', error.message);
    return;
  }

  reviews.forEach((review, index) => {
    const name     = review.display_name || 'Anónimo';
    const initials = getInitials(name);
    const stars    = Array.from({ length: 5 }, (_, i) => {
      const active = i < review.rating;
      return `<span class="${active ? 'text-barber-gold' : 'text-gray-700'}">${STAR_SVG}</span>`;
    }).join('');

    // Sanitización XSS
    const safeContent = review.content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const safeName = name
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const figure = document.createElement('figure');
    figure.setAttribute('data-dynamic', 'true');

    // La animación se aplica inline con un delay escalonado por índice.
    // Usamos style directamente para evitar que el override [data-aos]
    // del HTML interfiera con las clases de Tailwind animate-[].
    figure.style.opacity    = '0';
    figure.style.transform  = 'translateY(15px)';
    figure.style.animation  = `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`;
    figure.className = [
      'bg-barber-dark border border-gray-800 p-6 sm:p-8 rounded-sm',
      'hover:border-barber-gold transition-all duration-500',
      'transform hover:-translate-y-1 shadow-xl',
    ].join(' ');

    figure.innerHTML = `
      <div class="flex gap-0.5 mb-3 sm:mb-4" aria-label="${review.rating} de 5 estrellas">
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
// AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────

// Login con Google (1 clic)
btnGoogleLogin.addEventListener('click', async () => {
  btnGoogleLogin.disabled = true;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
  if (error) {
    showMsg(authMessage, `Error: ${error.message}`, true);
    btnGoogleLogin.disabled = false;
  }
  // Sin error → el navegador redirige a Google automáticamente
});

// Login con Magic Link
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

// Cerrar sesión
btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Escucha cambios de sesión.
// Guard en INITIAL_SESSION: evita ejecutar syncUI dos veces al cargar
// (una vez desde getSession() en el IIFE y otra desde este listener).
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION') return;
  syncUI(session);
});


// ─────────────────────────────────────────────────────────────────
// ENVÍO DE RESEÑA (INSERT)
// ─────────────────────────────────────────────────────────────────
btnSubmit.addEventListener('click', async () => {
  const content     = document.getElementById('review-content').value.trim();
  const displayName = document.getElementById('review-display-name').value.trim();
  const rating      = parseInt(hiddenRating.value, 10);

  if (content.length < 3) {
    showMsg(reviewMessage, 'La reseña debe tener al menos 3 caracteres.', true);
    return;
  }
  if (rating < 1 || rating > 5) {
    showMsg(reviewMessage, 'Selecciona una calificación entre 1 y 5 estrellas.', true);
    return;
  }

  // Fix doble-tap mobile: bloqueamos el botón completamente
  setSubmitLoading(true);

  // Payload exacto del Contrato de Datos §3-A
  const payload = {
    display_name: displayName || 'Anónimo',
    content,
    rating,
  };

  const { error } = await supabase.from('reviews').insert(payload);

  if (error) {
    showMsg(reviewMessage, `No se pudo enviar: ${error.message}`, true);
  } else {
    showMsg(reviewMessage, '¡Gracias! Tu reseña será publicada tras ser aprobada.');
    document.getElementById('review-content').value      = '';
    document.getElementById('review-display-name').value = '';
    renderStars(5);
  }

  setSubmitLoading(false);
});


// ─────────────────────────────────────────────────────────────────
btnLoadMore.addEventListener('click', () => {
  // Sumamos 3 al límite y volvemos a pintar
  resenasVisibles += 3;
  renderizarResenasVisibles();
});

// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────────
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  syncUI(session);
  await loadApprovedReviews();
})();