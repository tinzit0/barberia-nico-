// ============================================
// js/main.js — Inicializador general
// ============================================
import './app.js'

// ── Cargar reseñas aprobadas al iniciar ──
cargarResenas()

// ── Formulario de Magic Link ──
const formLogin = document.getElementById('form-magic-link')
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = document.getElementById('input-email').value.trim()
        if (!email) return
        await loginConMagicLink(email)
    })
}

// ── Formulario de nueva reseña ──
const formResena = document.getElementById('form-resena')
if (formResena) {
    formResena.addEventListener('submit', async (e) => {
        e.preventDefault()

        const display_name = document.getElementById('input-alias').value
        const content      = document.getElementById('input-content').value
        const rating       = document.querySelector('input[name="rating"]:checked')?.value

        const ok = await enviarResena({ display_name, content, rating })
        if (ok) {
            formResena.reset()
            cargarResenas()
        }
    })
}

// ── Botón cerrar sesión ──
const btnLogout = document.getElementById('btn-logout')
if (btnLogout) {
    btnLogout.addEventListener('click', logout)
}
