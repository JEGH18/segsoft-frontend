import { describe, it, expect } from 'vitest';
import { bitbucketKind, normalizeGitUrl } from './gitUrl';

const P2TOOLS = 'https://pi2tools.icesi.edu.co/bitbucket';

describe('bitbucketKind', () => {
  it.each([
    'https://bitbucket.org/pi2tools/repo.git',
    'https://david@bitbucket.org/pi2tools/repo.git',
    'git clone https://david@bitbucket.org/pi2tools/repo.git',
    'https://BitBucket.org/pi2tools/repo.git',
  ])('detects Bitbucket Cloud in %s', (url) => {
    expect(bitbucketKind(url)).toBe('cloud');
  });

  it.each([
    `${P2TOOLS}/scm/segsoft/segsoft-backend.git`,
    'git clone https://dtroya@pi2tools.icesi.edu.co/bitbucket/scm/segsoft/segsoft-backend.git',
    `${P2TOOLS}/projects/SEGSOFT/repos/segsoft-backend/browse`,
    'https://git.example.com/scm/proj/repo.git',
  ])('detects Bitbucket Server in %s', (url) => {
    expect(bitbucketKind(url)).toBe('server');
  });

  it.each([
    'https://github.com/user/repo.git',
    'https://notbitbucket.org/user/repo.git',
    'https://bitbucket.org.evil.com/user/repo.git',
    'not a url',
    '',
  ])('rejects %s', (url) => {
    expect(bitbucketKind(url)).toBeNull();
  });
});

describe('normalizeGitUrl', () => {
  it('strips the "git clone" prefix and the username Bitbucket puts in its Clone button', () => {
    expect(normalizeGitUrl('git clone https://david@bitbucket.org/pi2tools/repo.git'))
      .toBe('https://bitbucket.org/pi2tools/repo.git');
  });

  it('strips a bare username from a Bitbucket URL', () => {
    expect(normalizeGitUrl('  https://david@bitbucket.org/pi2tools/repo.git  '))
      .toBe('https://bitbucket.org/pi2tools/repo.git');
  });

  it('strips the username from a p2tools Clone button URL', () => {
    expect(normalizeGitUrl('git clone https://dtroya@pi2tools.icesi.edu.co/bitbucket/scm/segsoft/segsoft-backend.git'))
      .toBe(`${P2TOOLS}/scm/segsoft/segsoft-backend.git`);
  });

  it.each([
    `${P2TOOLS}/projects/SEGSOFT/repos/segsoft-backend/browse`,
    `${P2TOOLS}/projects/SEGSOFT/repos/segsoft-backend/browse/src/main?at=refs%2Fheads%2Fmain`,
    `${P2TOOLS}/projects/SEGSOFT/repos/segsoft-backend`,
  ])('turns the p2tools repository page %s into its clone URL', (url) => {
    expect(normalizeGitUrl(url)).toBe(`${P2TOOLS}/scm/segsoft/segsoft-backend.git`);
  });

  it('leaves a p2tools clone URL as is', () => {
    expect(normalizeGitUrl(`${P2TOOLS}/scm/segsoft/segsoft-backend.git`))
      .toBe(`${P2TOOLS}/scm/segsoft/segsoft-backend.git`);
  });

  it('leaves a user:password pair for the backend to reject', () => {
    expect(normalizeGitUrl('https://x-token-auth:secret@bitbucket.org/pi2tools/repo.git'))
      .toBe('https://x-token-auth:secret@bitbucket.org/pi2tools/repo.git');
  });

  it('does not touch credentials in non-Bitbucket URLs', () => {
    expect(normalizeGitUrl('https://ghp_token@github.com/user/repo.git'))
      .toBe('https://ghp_token@github.com/user/repo.git');
  });

  it('only trims a plain URL', () => {
    expect(normalizeGitUrl(' https://github.com/user/repo.git ')).toBe('https://github.com/user/repo.git');
  });
});
