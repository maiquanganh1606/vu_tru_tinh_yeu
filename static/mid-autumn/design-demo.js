const params = new URLSearchParams(window.location.search);
if (params.has('design-demo')) {
  const variants = {
    warm: {
      name: 'Mật ong rằm',
      kicker: 'PHƯƠNG ÁN A · ÁNH VÀNG ẤM',
      title: 'Trăng vàng ôm lấy\nngôi sao nhỏ.',
      description: 'Một vầng trăng tròn, sáng ấm như mật ong; ngôi sao đèn có đôi mắt nhỏ và những nhịp lấp lánh mềm mại.',
      note: 'Ấm áp · gần gũi · giữ chất Trung Thu truyền thống'
    },
    rose: {
      name: 'Kẹo hồ lô',
      kicker: 'PHƯƠNG ÁN B · VÀNG HỒNG CỔ TÍCH',
      title: 'Đêm trăng mềm hơn\nmột chút nhé.',
      description: 'Ánh vàng pha hồng đào tạo cảm giác ngọt và trẻ; sao đèn nghiêng nhẹ, má hồng và sparkle chuyển nhịp như đang cười.',
      note: 'Dễ thương · lãng mạn · nổi bật trên nền tím đêm'
    },
    starlight: {
      name: 'Sao ôm trăng',
      kicker: 'PHƯƠNG ÁN C · CỤM SAO LUNG LINH',
      title: 'Một vì sao\ngọi trăng thức giấc.',
      description: 'Trăng có viền sáng rõ và cụm sao bốn cánh bay quanh; phù hợp nếu muốn khoảnh khắc mở đầu có cảm giác kỳ diệu hơn.',
      note: 'Cinematic · nhiều chuyển động · giàu điểm nhấn'
    }
  };
  const fallback = 'warm';
  let active = variants[params.get('design-demo')] ? params.get('design-demo') : fallback;
  const root = document.createElement('section');
  root.id = 'design-demo';
  root.className = `design-demo design-demo--${active}`;
  root.setAttribute('aria-label', 'Demo thiết kế trăng và ngôi sao');
  root.innerHTML = `
    <div class="design-demo__backdrop" aria-hidden="true">
      <span class="design-demo__pin pin-a"></span><span class="design-demo__pin pin-b"></span>
      <span class="design-demo__pin pin-c"></span><span class="design-demo__pin pin-d"></span>
    </div>
    <header class="design-demo__top">
      <a class="design-demo__brand" href="/trung-thu/">ĐÊM TRĂNG ĐOÀN VIÊN <small>DEMO THIẾT KẾ</small></a>
      <a class="design-demo__close" href="/trung-thu/">Thoát demo <span aria-hidden="true">↗</span></a>
    </header>
    <div class="design-demo__content">
      <div class="design-demo__copy">
        <p class="design-demo__eyebrow" id="design-demo-kicker"></p>
        <h1 id="design-demo-title"></h1>
        <p class="design-demo__description" id="design-demo-description"></p>
        <p class="design-demo__state" id="design-demo-state" role="status"></p>
      </div>
      <div class="design-demo__visual" aria-label="Minh họa trăng vàng và ngôi sao">
        <div class="design-moon" aria-hidden="true">
          <span class="moon-crater crater-a"></span><span class="moon-crater crater-b"></span>
          <span class="moon-crater crater-c"></span><span class="moon-crater crater-d"></span>
          <span class="moon-crater crater-e"></span>
        </div>
        <div class="star-orbit orbit-a" aria-hidden="true"></div>
        <div class="star-orbit orbit-b" aria-hidden="true"></div>
        <div class="demo-star-wrap" aria-hidden="true">
          <span class="sparkle sparkle-a"></span><span class="sparkle sparkle-b"></span>
          <span class="sparkle sparkle-c"></span><span class="sparkle sparkle-d"></span>
          <div class="demo-star">
            <span class="star-eye eye-a"></span><span class="star-eye eye-b"></span>
            <span class="star-blush blush-a"></span><span class="star-blush blush-b"></span>
            <span class="star-mouth"></span>
          </div>
          <span class="star-tassel tassel-a"></span><span class="star-tassel tassel-b"></span>
        </div>
        <span class="demo-visual-caption">TRĂNG + SAO · BẢN DỰNG MINH HỌA</span>
      </div>
    </div>
    <nav class="design-demo__switcher" aria-label="Chọn phương án thiết kế">
      <div class="design-demo__switcher-copy"><span>ĐANG XEM</span><strong id="design-demo-name"></strong></div>
      <div class="design-demo__options">
        <button type="button" data-variant="warm" aria-pressed="false"><b>A</b><span>Mật ong rằm</span></button>
        <button type="button" data-variant="rose" aria-pressed="false"><b>B</b><span>Kẹo hồ lô</span></button>
        <button type="button" data-variant="starlight" aria-pressed="false"><b>C</b><span>Sao ôm trăng</span></button>
      </div>
      <p class="design-demo__hint" id="design-demo-hint"></p>
    </nav>
    <p class="design-demo__sr" id="design-demo-announce" aria-live="polite"></p>
  `;
  document.body.append(root);

  const title = root.querySelector('#design-demo-title');
  const state = root.querySelector('#design-demo-state');
  const name = root.querySelector('#design-demo-name');
  const hint = root.querySelector('#design-demo-hint');
  const announce = root.querySelector('#design-demo-announce');
  const kicker = root.querySelector('#design-demo-kicker');
  const description = root.querySelector('#design-demo-description');

  function render(next, announceChange = false) {
    active = variants[next] ? next : fallback;
    const item = variants[active];
    root.className = `design-demo design-demo--${active}`;
    kicker.textContent = item.kicker;
    title.innerHTML = item.title.replace(/\n/g, '<br>');
    description.textContent = item.description;
    state.textContent = item.note;
    name.textContent = item.name;
    hint.textContent = 'Chọn A, B hoặc C để so sánh. Đây là bản demo duyệt, chưa thay đổi scene chính.';
    root.querySelectorAll('[data-variant]').forEach(button => {
      const selected = button.dataset.variant === active;
      button.setAttribute('aria-pressed', String(selected));
    });
    if (announceChange) announce.textContent = `Đang xem ${item.name}. ${item.note}.`;
  }

  root.querySelectorAll('[data-variant]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.dataset.variant;
      const url = new URL(window.location.href);
      url.searchParams.set('design-demo', next);
      window.history.replaceState({}, '', url);
      render(next, true);
    });
  });
  render(active);
}
