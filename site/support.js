/* ==========================================================================
   Support form (support.html).
   ==========================================================================

   Posts to /api/support, the Pages Function in functions/api/support.js on
   this same site, which emails the message to support@touchward-dopamine.com
   through Resend. The visitor's address goes in as the reply-to, so answering
   the notification answers them.

   There is no API key in this file and there must never be one: this ships to
   every visitor. The Resend key lives in the Pages project's environment
   variables and is only ever read by the Function.

   If the post fails for any reason the visitor is handed a ready-made mailto
   link carrying what they typed, so a broken endpoint costs a click, not the
   message.
   ========================================================================== */
(function () {
  var ENDPOINT = '/api/support';
  var INBOX = 'support@touchward-dopamine.com';

  var form = document.getElementById('support-form');
  if (!form) return;

  // Time the form spent on screen. A person cannot read, type and submit in
  // under a couple of seconds; scripted posts routinely do it in milliseconds.
  var renderedAt = Date.now();

  var success = document.getElementById('support-success');
  var errorEl = document.getElementById('support-error');
  var submit = document.getElementById('support-submit');

  function showError(html) {
    errorEl.innerHTML = html;
    errorEl.hidden = false;
  }

  function collect() {
    return {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      topic: form.elements.topic.value,
      platform: form.elements.platform.value,
      message: form.elements.message.value.trim(),
      elapsedMs: Date.now() - renderedAt,
      source: location.pathname + location.search,
      userAgent: navigator.userAgent || ''
    };
  }

  function validate(data) {
    if (!data.email) return 'Please add your email address, so we can reply.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'That email address does not look right.';
    if (!data.message) return 'Please tell us what is going on. A sentence is plenty.';
    return null;
  }

  function mailtoFor(data) {
    var subject = 'Touchward support: ' + data.topic;
    var body = data.message + '\n\n' + (data.platform ? data.platform + '\n' : '') + (data.name ? data.name + '\n' : '') + data.email;
    return 'mailto:' + INBOX +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var data = collect();
    var problem = validate(data);
    if (problem) { showError(problem); return; }

    submit.disabled = true;
    submit.textContent = 'Sending...';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error('Bad status ' + res.status);
      form.hidden = true;
      success.hidden = false;
      var heading = document.getElementById('support-confirmed');
      if (heading) heading.focus();
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      submit.disabled = false;
      submit.textContent = 'Send message';
      showError('Something went wrong on our end. Please try again, or ' +
        '<a class="link" href="' + mailtoFor(data).replace(/"/g, '&quot;') + '">send it from your email app</a> ' +
        'and it will reach the same inbox.');
    });
  });
})();
