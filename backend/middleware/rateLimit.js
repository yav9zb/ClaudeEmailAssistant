import LRU from 'lru-cache';

const rateLimitCache = new LRU({
  max: 500,
  ttl: 15 * 60 * 1000, // 15 minutes
});

export const rateLimit = (req, res) => {
  return new Promise((resolve, reject) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const currentCount = rateLimitCache.get(ip) || 0;
    
    if (currentCount >= 100) {
      reject(new Error('Too many requests'));
    } else {
      rateLimitCache.set(ip, currentCount + 1);
      resolve();
    }
  });
};