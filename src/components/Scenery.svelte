<script lang="ts"></script>
<!-- The illustrated horizon along the bottom of every screen (decoration only). -->
<div class="scenery" aria-hidden="true">
  <div class="glow"></div>
  <svg viewBox="0 0 1024 90" preserveAspectRatio="none">
    <path d="M0 90 L0 55 Q 160 25 320 50 T 680 45 T 1024 55 L1024 90 Z" fill="#CDEBD5" />
    <path d="M0 90 L0 70 Q 220 50 460 66 T 1024 68 L1024 90 Z" fill="#A9DCB8" />
  </svg>
  <span class="leaf l1">🌿</span>
  <span class="leaf l2">🍃</span>
  <span class="leaf l3">🌱</span>
</div>

<style>
  .scenery {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 160px;
    pointer-events: none;
    z-index: 0;
  }
  .glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(46, 158, 91, 0.14), transparent);
  }
  svg {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 90px;
  }
  .leaf {
    position: absolute;
    opacity: 0.55;
    font-size: 26px;
  }
  .l1 {
    bottom: 24px;
    left: 40px;
    font-size: 30px;
  }
  .l2 {
    bottom: 20px;
    left: 50%;
  }
  .l3 {
    bottom: 32px;
    right: 96px;
  }
</style>
