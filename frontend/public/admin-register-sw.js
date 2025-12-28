// Service worker registration for admin app
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/admin-sw.js')
      .then((registration) => {
        console.log('Admin SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('Admin SW registration failed: ', registrationError);
      });
  });
}


