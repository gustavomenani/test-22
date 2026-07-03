import { initializeApp }                        from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getFunctions, httpsCallable }           from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-5zcgd5lToWSesA4Lf7k7gs8zqihGNrw",
  authDomain: "bora-cliente.firebaseapp.com",
  projectId: "bora-cliente",
  storageBucket: "bora-cliente.firebasestorage.app",
  messagingSenderId: "801263217269",
  appId: "1:801263217269:web:859704610d8d29aa62e63c"
};

const app       = initializeApp(firebaseConfig);
const db        = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");
const verifyTurnstile = httpsCallable(functions, "verifyTurnstile");

// ── Theme Toggle (Preserved for pages like sobre.html) ────────────────
function initThemeToggle() {
  const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
    });
  });
}

// ── Máscara de telefone ──────────────────────────────
function initPhoneMask() {
  const phoneInput = document.getElementById('phone');
  if (!phoneInput) return;

  phoneInput.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) {
      v = v.length === 11
        ? `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
        : `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    e.target.value = v;
    e.target.classList.remove('invalid');
  });
}

// ── Validação do formulário ──────────────────────────
const MESSAGES = {
  name:     'Informe seu nome completo.',
  email:    'Informe um e-mail válido.',
  phone:    'Informe um celular válido com DDD, ex: (21) 99999-9999.',
  bairro:   'Informe seu bairro no Rio de Janeiro.',
  category: 'Escolha sua categoria principal.',
};

function validateForm() {
  const userTypeVal = document.getElementById('userType').value;
  const fields = ['name', 'email', 'phone', 'bairro'];
  
  if (userTypeVal && !userTypeVal.includes('contratar')) {
    fields.push('category');
  }

  let firstError = null;
  let errorMsg = '';

  fields.forEach(id => {
    const el  = document.getElementById(id);
    if (!el) return;
    const val = el.value.trim();
    let invalid = false;

    if (!val || (id === 'category' && val === '')) {
      invalid = true;
      if (!firstError) errorMsg = MESSAGES[id];
    } else if (id === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        invalid = true;
        if (!firstError) errorMsg = MESSAGES.email;
      }
    } else if (id === 'phone') {
      const digits = val.replace(/\D/g, '');
      if (digits.length !== 10 && digits.length !== 11) {
        invalid = true;
        if (!firstError) errorMsg = MESSAGES.phone;
      }
    }

    el.classList.toggle('invalid', invalid);
    if (invalid && !firstError) firstError = el;
  });

  const errDiv = document.getElementById('form-error');
  if (firstError) {
    if (errDiv) {
      errDiv.textContent = errorMsg;
      errDiv.style.display = 'block';
    }
    firstError.focus();
    return false;
  }

  if (errDiv) errDiv.style.display = 'none';
  return true;
}

// ── Envio do Formulário de Lista de Espera ──────────────────────────
function initFormSubmit() {
  const form = document.getElementById('waitlistForm');
  if (!form) return;

  // Limpa mensagens de erro ao digitar nos campos
  ['name', 'email', 'phone', 'bairro', 'category'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    ['input', 'change'].forEach(ev => el.addEventListener(ev, function() {
      this.classList.remove('invalid');
      const errDiv = document.getElementById('form-error');
      if (errDiv) errDiv.style.display = 'none';
    }));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!validateForm()) return;

    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileToken) {
      const errDiv = document.getElementById('form-error');
      if (errDiv) {
        errDiv.textContent = 'Complete a verificação de segurança antes de continuar.';
        errDiv.style.display = 'block';
      }
      return;
    }

    const btn = document.getElementById('submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Verificando...';
    }

    try {
      await verifyTurnstile({ token: turnstileToken });

      if (btn) btn.textContent = 'Enviando...';

      const nameVal = document.getElementById('name').value;
      const phoneVal = document.getElementById('phone').value;
      const bairroVal = document.getElementById('bairro').value;
      const userTypeVal = document.getElementById('userType').value;
      const emailVal = document.getElementById('email').value;
      const cityVal = document.getElementById('city').value;
      const stateVal = document.getElementById('state').value;
      const categoryVal = document.getElementById('category').value;

      await addDoc(collection(db, 'waitlist'), {
        name:      nameVal,
        email:     emailVal,
        phone:     phoneVal,
        city:      cityVal,
        state:     stateVal,
        bairro:    bairroVal,
        userType:  userTypeVal,
        category:  categoryVal,
        source:    'landing_page',
        status:    'waiting',
        createdAt: serverTimestamp()
      });

      // Transição para tela de sucesso conforme o mockup de referência
      const formView = document.getElementById('formView');
      if (formView) formView.style.display = 'none';
      
      const successView = document.getElementById('successView');
      const successMsg = document.getElementById('successMsg');
      if (successView) {
        if (successMsg) {
          if (userTypeVal.includes('oferecer')) {
            successMsg.textContent = `Boa, ${nameVal.split(' ')[0]}! Você entrou como profissional fundador. A gente te chama pra cadastrar assim que abrirmos no Rio.`;
          } else if (userTypeVal.includes('vender')) {
            successMsg.textContent = `Sensacional, ${nameVal.split(' ')[0]}! Sua loja está cadastrada na lista de pioneiros do Bora. Entraremos em contato em breve.`;
          } else {
            successMsg.textContent = `Boa, ${nameVal.split(' ')[0]}! Você está na lista de pioneiros. Fica de olho no WhatsApp — te avisamos no lançamento.`;
          }
        }
        successView.classList.add('show');
      }

      form.reset();
      if (window.turnstile) window.turnstile.reset();
    } catch (error) {
      console.error(error);
      const errDiv = document.getElementById('form-error');
      if (errDiv) {
        errDiv.textContent = 'Erro ao realizar cadastro. Tente novamente.';
        errDiv.style.display = 'block';
      }
      if (window.turnstile) window.turnstile.reset();
    } finally {
      if (btn) {
        btn.disabled = false;
        if (userTypeVal.includes('oferecer')) {
          btn.textContent = 'Quero ser profissional fundador';
        } else if (userTypeVal.includes('vender')) {
          btn.textContent = 'Quero ser lojista pioneiro';
        } else {
          btn.textContent = 'Garantir meu lugar de pioneiro';
        }
      }
    }
  });
}

// ── Alternador de Objetivos (Contratar vs Trabalhar) ──────────────────────────
function initGoalToggle() {
  const cli = document.getElementById('tgCli');
  const pre = document.getElementById('tgPre');
  const loj = document.getElementById('tgLoj');
  const userTypeInput = document.getElementById('userType');
  const btn = document.getElementById('submit-btn');

  if (!cli || !pre || !userTypeInput || !btn) return;

  const setGoal = (g) => {
    // Reset all states
    cli.classList.remove('on-cli');
    pre.classList.remove('on-pre');
    if (loj) loj.classList.remove('on-loj');

    const catField = document.getElementById('categoryField');
    const catSelect = document.getElementById('category');

    if (g === 'cli') {
      cli.classList.add('on-cli');
      userTypeInput.value = 'Quero contratar serviços';
      btn.textContent = 'Garantir meu lugar de pioneiro';
      btn.className = 'btn btn-cli';
      if (catField) catField.style.display = 'none';
      if (catSelect) {
        catSelect.value = '';
        catSelect.classList.remove('invalid');
      }
    } else if (g === 'pre') {
      pre.classList.add('on-pre');
      userTypeInput.value = 'Quero oferecer serviços';
      btn.textContent = 'Quero ser profissional fundador';
      btn.className = 'btn btn-pre';
      if (catField) catField.style.display = 'block';
      if (catSelect) catSelect.value = '';
    } else if (g === 'loj') {
      if (loj) loj.classList.add('on-loj');
      userTypeInput.value = 'Quero vender materiais';
      btn.textContent = 'Quero ser lojista pioneiro';
      btn.className = 'btn btn-loj';
      if (catField) catField.style.display = 'block';
      if (catSelect) catSelect.value = '';
    }
  };

  cli.addEventListener('click', () => setGoal('cli'));
  pre.addEventListener('click', () => setGoal('pre'));
  if (loj) loj.addEventListener('click', () => setGoal('loj'));

  // Initialize with Client state on load
  setGoal('cli');

  // Permitir botões na página com data-goal de pré-selecionarem o objetivo ao clicar
  document.querySelectorAll('[data-goal]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      setGoal(b.getAttribute('data-goal'));
      // Scroll to cadastro form
      const formEl = document.getElementById('cadastro');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ── FAQ ──────────────────────────────────────────────
function initFaq() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.nextElementSibling;
      const open = btn.classList.contains('open');
      document.querySelectorAll('.faq-q').forEach(q => {
        q.classList.remove('open');
        q.nextElementSibling.style.maxHeight = null;
      });
      if (!open) {
        btn.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });
}

// ── Rolagem do Cabeçalho ──────────────────────────────
function initScrollHeader() {
  const hd = document.getElementById('hd');
  if (!hd) return;
  window.addEventListener('scroll', () => {
    hd.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── Scroll Reveal ─────────────────────────────────────
function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ── Inicialização ──────────────────────────────────────

// ── Font Loading API to prevent FOUT (Flash of Unstyled Text) ─────────
if (document.fonts) {
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('fonts-loaded');
  });
} else {
  document.documentElement.classList.add('fonts-loaded');
}

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initPhoneMask();
  initGoalToggle();
  initFormSubmit();
  initFaq();
  initScrollHeader();
  initScrollReveal();
});
