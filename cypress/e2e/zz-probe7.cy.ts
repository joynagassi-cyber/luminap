describe('SONDE 7', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });
  const dump = (win: Window, tag: string) => {
    const d = win.document;
    const heads = Array.from(d.querySelectorAll('h1, h2, h3'))
      .map((e) => (e as HTMLElement).innerText.trim().slice(0, 40))
      .filter(Boolean);
    const pages = Array.from(d.querySelectorAll('div.ion-page')).map(
      (p) =>
        `${p.className.includes('ion-page-hidden') ? 'HID' : 'VIS'}:${(p as HTMLElement).innerText
          .replace(/\s+/g, ' ')
          .slice(0, 40)}`,
    );
    expect(
      `TAG=${tag} PATH=${win.location.pathname} HEADS=${JSON.stringify(heads)} PAGES=${JSON.stringify(pages.slice(0, 4))}`,
      'D',
    ).to.eq('__F__');
  };
  it('root /', function () {
    this.timeout(90_000);
    cy.visit('/');
    cy.wait(8000);
    cy.window().then((w) => dump(w, 'root'));
  });
  it('groups', function () {
    this.timeout(90_000);
    cy.visit('/groups');
    cy.wait(8000);
    cy.window().then((w) => dump(w, 'groups'));
  });
  it('balance', function () {
    this.timeout(90_000);
    cy.visit('/balance');
    cy.wait(8000);
    cy.window().then((w) => dump(w, 'balance'));
  });
});
