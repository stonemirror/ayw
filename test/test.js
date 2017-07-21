describe('This test', function() {
    it('should always return true', function() {
        expect(true).toBe(true);
    });
});

describe('Add', function() {
    it('should add two numbers together', function() {
        expect(add(2, 4)).toBe(6);
        expect(add(3, 6)).toBe(9);
    });
});
