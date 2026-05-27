/**
 * app.js — Sistema de Reseñas Dinámicas · Donatostudio Barbería
 * v3.0 — Diseño Premium y Paginación
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ─────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
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

function setSubmitLoading(isLoading) {
  btnSubmit.disabled = isLoading;
  btnSubmit.classList.toggle('pointer-events-none', isLoading);
  btnSubmit.textContent = isLoading ? 'Enviando...' : 'Enviar reseña';
}

// ─────────────────────────────────────────────────────────────────
// RENDERIZADO Y PAGINACIÓN DE RESEÑAS CON DISEÑO PREMIUM
// ─────────────────────────────────────────────────────────────────
let todasLasResenas = [];
let resenasVisibles = 3; 

async function loadApprovedReviews() {
  reviewsGrid.innerHTML = '';
  if (loadMoreContainer) loadMoreContainer.classList.add('hidden');

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
    console.error('Error cargando reseñas:', error.message);
    return;
  }

  todasLasResenas = reviews || [];
  renderizarResenasVisibles();
}

function renderizarResenasVisibles() {
  reviewsGrid.innerHTML = '';
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
    
    // AQUÍ ESTÁ EL CAMBIO: 
    // "p-6 sm:p-8" le devuelve su altura normal.
    // "w-full max-w-sm mx-auto" evita que se alargue horizontalmente y que choque con los bordes.
    figure.className = 'relative w-full max-w-sm mx-auto flex flex-col overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gray-800/60 p-6 sm:p-8 rounded-md hover:border-barber-gold/80 transition-all duration-500 transform hover:-translate-y-1 shadow-2xl group';

    figure.innerHTML = `
      <!-- Comilla decorativa de fondo -->
      <svg class="absolute top-4 right-4 w-14 h-14 text-gray-800 opacity-20 group-hover:text-barber-gold group-hover:opacity-10 transition-colors duration-500 pointer-events-none" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>

      <!-- Estrellas -->
      <div class="relative z-10 flex gap-1 mb-4 sm:mb-5" aria-label="${review.rating} de 5 estrellas">
        ${stars}
      </div>

      <!-- Texto de reseña -->
      <blockquote class="relative z-10 flex-grow mb-6">
        <p class="text-sm sm:text-base text-gray-300 italic leading-relaxed">"${safeContent}"</p>
      </blockquote>

      <!-- Usuario y Avatar -->
      <figcaption class="relative z-10 flex items-center border-t border-gray-800/50 pt-4 mt-auto">
        <div class="w-10 h-10 bg-black border border-barber-gold/50 rounded-full flex items-center justify-center text-barber-gold font-bold font-serif text-sm shadow-[0_0_10px_rgba(212,175,55,0.15)]" aria-hidden="true">
          ${initials}
        </div>
        <cite class="ml-3 not-italic">
          <p class="text-white font-bold text-sm tracking-wide">${safeName}</p>
          <p class="text-[10px] sm:text-xs text-barber-gold/70 mt-0.5 uppercase tracking-wider font-semibold">Cliente Verificado</p>
        </cite>
      </figcaption>`;

    reviewsGrid.appendChild(figure);
  });

  if (loadMoreContainer) {
    if (todasLasResenas.length > resenasVisibles) {
      loadMoreContainer.classList.remove('hidden');
    } else {
      loadMoreContainer.classList.add('hidden');
    }
  }
}
// ─────────────────────────────────────────────────────────────────
// AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────
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
});

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

btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

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

  setSubmitLoading(true);

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
// BOTÓN VER MÁS
// ─────────────────────────────────────────────────────────────────
if (btnLoadMore) {
  btnLoadMore.addEventListener('click', () => {
    resenasVisibles += 3;
    renderizarResenasVisibles();
  });
}

// ─────────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────────
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  syncUI(session);
  await loadApprovedReviews();
})();