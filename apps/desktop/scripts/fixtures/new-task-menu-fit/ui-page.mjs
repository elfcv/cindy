import assert from 'node:assert/strict';

// Regression for the new-task page menus on short windows: the project menu was not
// capped to the space below its pill, so "新建项目" / "添加远程项目" at its bottom fell
// outside the window (reported on Windows; the layout is the same on every platform).
// 600px is Cindy's minimum window height; 688px is a maximized 1080p screen at 150%.
const EDGE = 8;

async function assertInside(page, locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label} must be rendered`);
  // The Electron engine has no Playwright viewport; read the page's own height.
  const height = await page.evaluate('window.innerHeight');
  assert.ok(box.y >= 0 && box.y + box.height <= height - EDGE + 0.5,
    `${label} must stay inside the window (bottom ${Math.round(box.y + box.height)}px, window ${height}px)`);
}

export default {
  name: 'new-task-menu-fit',
  entry: './menu-fit-fixture.tsx',
  viewport: { width: 1280, height: 600 },
  real: 'FolderPickerPopover and DeviceSwitcherPill with the real Radix popover placement',
  notCovered: 'The full new-task page and its data sources; the pills are placed at the same offsets as on that page.',
  stubs: { 'src/renderer/contexts/AuthContext': { partial: 'export const useAuth = () => ({dataOwnerId: "fixture", isAuthenticated: false});' } },
  cases: {
    default: { about: 'Project menu at the minimum window height keeps both bottom actions visible' },
    'project-1080p-150': {
      about: 'Project menu on a maximized 1080p screen at 150% scaling',
      viewport: { width: 1280, height: 688 },
    },
    'device-min-window': { about: 'Device menu at the minimum window height keeps every device reachable' },
  },
  async ready(page) { await page.getByTestId('open-project-menu').waitFor(); },
  async check(page, ui) {
    if (ui.case !== 'device-min-window') {
      await page.getByTestId('open-project-menu').click();
      const menu = page.getByRole('dialog');
      await menu.waitFor();
      await assertInside(page, menu, 'Project menu');
      const action = async (key) => menu.getByRole('button', { name: await ui.t(key), exact: true });
      await assertInside(page, await action('projectSettings.createTitle'), 'New project action');
      await assertInside(page, await action('newChat.projectPicker.addRemoteProject'), 'Add remote project action');
      await ui.capture('project-menu');
      return;
    }
    await page.getByTestId('create-agent-device-pill').click();
    const menu = page.getByRole('dialog');
    await menu.waitFor();
    await assertInside(page, menu, 'Device menu');
    const last = menu.getByTestId('create-agent-device-option').last();
    await last.scrollIntoViewIfNeeded();
    await assertInside(page, last, 'Last device');
    await ui.capture('device-menu');
  },
};
