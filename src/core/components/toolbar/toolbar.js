import $ from '../../shared/dom7';
import { nextFrame, bindMethods } from '../../shared/utils';

const Toolbar = {
  setHighlight(tabbarEl) {
    const app = this;
    const $tabbarEl = $(tabbarEl);
    if (app.theme === 'ios' && !$tabbarEl.hasClass('tabbar-highlight')) return;

    if (
      $tabbarEl.length === 0 ||
      !($tabbarEl.hasClass('tabbar') || $tabbarEl.hasClass('tabbar-labels'))
    )
      return;

    let $highlightEl = $tabbarEl.find('.tab-link-highlight');
    const tabLinksCount = $tabbarEl.find('.tab-link').length;
    if (tabLinksCount === 0) {
      $highlightEl.remove();
      return;
    }

    if ($highlightEl.length === 0) {
      $tabbarEl.children('.toolbar-inner').append('<span class="tab-link-highlight"></span>');
      $highlightEl = $tabbarEl.find('.tab-link-highlight');
    } else if ($highlightEl.next().length) {
      $tabbarEl.children('.toolbar-inner').append($highlightEl);
    }

    const $activeLink = $tabbarEl.find('.tab-link-active');
    let highlightWidth;
    let highlightTranslate;

    if ($tabbarEl.hasClass('tabbar-scrollable') && $activeLink && $activeLink[0]) {
      highlightWidth = `${$activeLink[0].offsetWidth}px`;
      highlightTranslate = `${$activeLink[0].offsetLeft}px`;
    } else {
      const activeIndex = $activeLink.index();
      highlightWidth = `${100 / tabLinksCount}%`;
      highlightTranslate = `${(app.rtl ? -activeIndex : activeIndex) * 100}%`;
    }

    nextFrame(() => {
      $highlightEl.css('width', highlightWidth).transform(`translate3d(${highlightTranslate},0,0)`);
    });
  },
  init(tabbarEl) {
    const app = this;
    app.toolbar.setHighlight(tabbarEl);
  },
  hide(el, animate = true) {
    const app = this;
    const $el = $(el);
    if ($el.hasClass('toolbar-hidden')) return;
    const className = `toolbar-hidden${animate ? ' toolbar-transitioning' : ''}`;
    $el.transitionEnd(() => {
      $el.removeClass('toolbar-transitioning');
    });
    $el.addClass(className);
    $el.trigger('toolbar:hide');
    app.emit('toolbarHide', $el[0]);
  },
  show(el, animate = true) {
    const app = this;
    const $el = $(el);
    if (!$el.hasClass('toolbar-hidden')) return;
    if (animate) {
      $el.addClass('toolbar-transitioning');
      $el.transitionEnd(() => {
        $el.removeClass('toolbar-transitioning');
      });
    }
    $el.removeClass('toolbar-hidden');
    $el.trigger('toolbar:show');
    app.emit('toolbarShow', $el[0]);
  },
  initToolbarOnScroll(pageEl) {
    const app = this;
    const $pageEl = $(pageEl);
    let $toolbarEl = $pageEl.parents('.view').children('.toolbar');
    if ($toolbarEl.length === 0) {
      $toolbarEl = $pageEl.find('.toolbar');
    }
    if ($toolbarEl.length === 0) {
      $toolbarEl = $pageEl.parents('.views').children('.tabbar, .tabbar-labels');
    }
    if ($toolbarEl.length === 0) {
      return;
    }

    let previousScrollTop;
    let currentScrollTop;

    let scrollHeight;
    let offsetHeight;
    let reachEnd;
    let action;
    let toolbarHidden;
    function handleScroll(e) {
      if ($pageEl.hasClass('page-with-card-opened')) return;
      if ($pageEl.hasClass('page-previous')) return;
      const scrollContent = this;
      if (e && e.target && e.target !== scrollContent) {
        return;
      }
      currentScrollTop = scrollContent.scrollTop;
      scrollHeight = scrollContent.scrollHeight;
      offsetHeight = scrollContent.offsetHeight;
      reachEnd = currentScrollTop + offsetHeight >= scrollHeight;
      toolbarHidden = $toolbarEl.hasClass('toolbar-hidden');

      if (reachEnd) {
        if (app.params.toolbar.showOnPageScrollEnd) {
          action = 'show';
        }
      } else if (previousScrollTop > currentScrollTop) {
        if (app.params.toolbar.showOnPageScrollTop || currentScrollTop <= 44) {
          action = 'show';
        } else {
          action = 'hide';
        }
      } else if (currentScrollTop > 44) {
        action = 'hide';
      } else {
        action = 'show';
      }

      if (action === 'show' && toolbarHidden) {
        app.toolbar.show($toolbarEl);
        toolbarHidden = false;
      } else if (action === 'hide' && !toolbarHidden) {
        app.toolbar.hide($toolbarEl);
        toolbarHidden = true;
      }

      previousScrollTop = currentScrollTop;
    }
    $pageEl.on('scroll', '.page-content', handleScroll, true);
    $pageEl[0].f7ScrollToolbarHandler = handleScroll;
  },
};
export default {
  name: 'toolbar',
  create() {
    const app = this;
    bindMethods(app, {
      toolbar: Toolbar,
    });
  },
  params: {
    toolbar: {
      hideOnPageScroll: false,
      showOnPageScrollEnd: true,
      showOnPageScrollTop: true,
    },
  },
  on: {
    pageBeforeRemove(page) {
      if (page.$el[0].f7ScrollToolbarHandler) {
        page.$el.off('scroll', '.page-content', page.$el[0].f7ScrollToolbarHandler, true);
      }
    },
    pageBeforeIn(page) {
      const app = this;
      let $toolbarEl = page.$el.parents('.view').children('.toolbar');
      if ($toolbarEl.length === 0) {
        $toolbarEl = page.$el.parents('.views').children('.tabbar, .tabbar-labels');
      }
      if ($toolbarEl.length === 0) {
        $toolbarEl = page.$el.find('.toolbar');
      }
      if ($toolbarEl.length === 0) {
        return;
      }
      if (page.$el.hasClass('no-toolbar')) {
        app.toolbar.hide($toolbarEl);
      } else {
        app.toolbar.show($toolbarEl);
      }
    },
    pageInit(page) {
      const app = this;
      page.$el.find('.tabbar, .tabbar-labels').each((tabbarEl) => {
        app.toolbar.init(tabbarEl);
      });
      if (
        app.params.toolbar.hideOnPageScroll ||
        page.$el.find('.hide-toolbar-on-scroll').length ||
        page.$el.hasClass('hide-toolbar-on-scroll') ||
        page.$el.find('.hide-bars-on-scroll').length ||
        page.$el.hasClass('hide-bars-on-scroll')
      ) {
        if (
          page.$el.find('.keep-toolbar-on-scroll').length ||
          page.$el.hasClass('keep-toolbar-on-scroll') ||
          page.$el.find('.keep-bars-on-scroll').length ||
          page.$el.hasClass('keep-bars-on-scroll')
        ) {
          return;
        }
        app.toolbar.initToolbarOnScroll(page.el);
      }
    },
    init() {
      const app = this;
      app.$el.find('.tabbar, .tabbar-labels').each((tabbarEl) => {
        app.toolbar.init(tabbarEl);
      });
    },
  },
  vnode: {
    tabbar: {
      insert(vnode) {
        const app = this;
        app.toolbar.init(vnode.elm);
      },
    },
  },
};
