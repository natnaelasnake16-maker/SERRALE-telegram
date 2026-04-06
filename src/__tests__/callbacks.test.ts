const { isJobFilterKey } = require('../types');

describe('callback helpers', () => {
    it('recognizes valid job filter keys', () => {
        expect(isJobFilterKey('remote')).toBe(true);
        expect(isJobFilterKey('saved')).toBe(true);
    });

    it('rejects invalid job filter keys', () => {
        expect(isJobFilterKey('archive')).toBe(false);
    });
});
