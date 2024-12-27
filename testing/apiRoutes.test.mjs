import request from 'supertest';
import server from '../server/server.mjs';

describe('GET /api/games', () => {
    let app;

    beforeAll(async () => {
        app = server;
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return an array of games with a 200 status code', async () => {
        try {
            const response = await request(app).get('/api/games');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        } catch (error) {
            console.error("Test failed:", error);
            throw error;
        }
    });
});