/** JWT sin firma válida para pruebas: el frontend solo lee `exp`, la firma la verifica la API. */
export function fakeToken(secondsFromNow = 3600): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '1', exp })}.firma`;
}
