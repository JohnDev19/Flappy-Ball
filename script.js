       const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const startScreen = document.getElementById('startScreen');
        const playAgainScreen = document.getElementById('playAgainScreen');
        const pauseScreen = document.getElementById('pauseScreen');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const highScoreDisplay = document.getElementById('highScoreDisplay');
        const levelDisplay = document.getElementById('levelDisplay');
        const finalScoreSpan = document.getElementById('finalScore');
        const finalHighScoreSpan = document.getElementById('finalHighScore');
        const powerUpIndicator = document.getElementById('powerUpIndicator');
        const pauseButton = document.getElementById('pauseButton');

        // Game variables
        let gameLoop;
        let ball = {
            x: 100,
            y: 300,
            radius: 20,
            dy: 0,
            rotation: 0,
            trail: [],
            powerUp: false,
            powerUpTime: 0,
            powerUpType: null,
            gravity: 0.1,
            bounce: 0,
            maxJumpSpeed: -12 
        };
        let obstacles = [];
        let particles = [];
        let powerUps = [];
        let score = 0;
        let highScore = 0;
        let level = 1;
        let isPlaying = false;
        let isPaused = false;
        let frameCount = 0;
        let gameSpeed = 3;

        if (localStorage.getItem('highScore')) {
            highScore = parseInt(localStorage.getItem('highScore'));
            highScoreDisplay.textContent = `High Score: ${highScore}`;
        }

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a1929');
        gradient.addColorStop(0.5, '#132f4c');
        gradient.addColorStop(1, '#0a1929');

        class PowerUp {
            constructor() {
                this.x = canvas.width + 50;
                this.y = Math.random() * (canvas.height - 100) + 50;
                this.radius = 15;
                this.rotation = 0;
                this.collected = false;
                this.type = Math.random() < 0.5 ? 'invincibility' : 'slowMotion';
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Star shape
                ctx.beginPath();
                for(let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.radius,
                              Math.sin((18 + i * 72) * Math.PI / 180) * this.radius);
                    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.radius/2),
                              Math.sin((54 + i * 72) * Math.PI / 180) * (this.radius/2));
                }
                ctx.closePath();
                
                // Gradient fill
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                if (this.type === 'invincibility') {
                    gradient.addColorStop(0, '#ffd700');
                    gradient.addColorStop(1, '#ff6b6b');
                } else {
                    gradient.addColorStop(0, '#00ffff');
                    gradient.addColorStop(1, '#1e90ff');
                }
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Glow effect
                ctx.shadowColor = this.type === 'invincibility' ? '#ffd700' : '#00ffff';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
                
                this.rotation += 0.02;
            }

            update() {
                this.x -= gameSpeed;
            }
        }

        class Obstacle {
            constructor(x, topHeight, gap) {
                this.x = x;
                this.width = 70;
                this.topHeight = topHeight;
                this.bottomHeight = canvas.height - topHeight - gap;
                this.passed = false;
                this.gradient = null;
                this.createGradient();
            }

            createGradient() {
                // Top obstacle gradient
                this.topGradient = ctx.createLinearGradient(
                    this.x, 0,
                    this.x + this.width, this.topHeight
                );
                this.topGradient.addColorStop(0, '#2e7d32');
                this.topGradient.addColorStop(0.5, '#43a047');
                this.topGradient.addColorStop(1, '#2e7d32');

                // Bottom obstacle gradient
                this.bottomGradient = ctx.createLinearGradient(
                    this.x, canvas.height - this.bottomHeight,
                    this.x + this.width, canvas.height
                );
                this.bottomGradient.addColorStop(0, '#2e7d32');
                this.bottomGradient.addColorStop(0.5, '#43a047');
                this.bottomGradient.addColorStop(1, '#2e7d32');
            }

            draw() {
                // Top obstacle
                ctx.save();
                
                // Main body
                ctx.fillStyle = this.topGradient;
                ctx.fillRect(this.x, 0, this.width, this.topHeight);
                
                // Edge highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(this.x + 2, 0, 3, this.topHeight);
                
                // Metal cap
                ctx.fillStyle = '#455a64';
                ctx.fillRect(this.x - 5, this.topHeight - 10, this.width + 10, 10);
                
                // Texture
                for(let i = 20; i < this.topHeight - 10; i += 40) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.fillRect(this.x, i, this.width, 20);
                }

                // Bottom obstacle
                ctx.fillStyle = this.bottomGradient;
                
                ctx.fillRect(
                    this.x,
                    canvas.height - this.bottomHeight,
                    this.width,
                    this.bottomHeight
                );
                
                // Edge highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(
                    this.x + 2,
                    canvas.height - this.bottomHeight,
                    3,
                    this.bottomHeight
                );
                
                // Metal cap
                ctx.fillStyle = '#455a64';
                ctx.fillRect(
                    this.x - 5,
                    canvas.height - this.bottomHeight,
                    this.width + 10,
                    10
                );
                
                // Texture
                for(let i = canvas.height - this.bottomHeight + 20; i < canvas.height; i += 40) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.fillRect(this.x, i, this.width, 20);
                }
                
                ctx.restore();
            }
        }

        function createParticle(x, y, color) {
            return {
                x,
                y,
                radius: Math.random() * 3 + 1,
                dx: (Math.random() - 0.5) * 6,
                dy: (Math.random() - 0.5) * 6,
                life: 60,
                color,
                alpha: 1
            };
        }

        function drawBall() {
            // Trail with gradient
            ball.trail.forEach((pos, index) => {
                const alpha = index / ball.trail.length;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, ball.radius * (0.5 + alpha * 0.5), 0, Math.PI * 2);
                const trailGradient = ctx.createRadialGradient(
                    pos.x, pos.y, 0,
                    pos.x, pos.y, ball.radius
                );
                trailGradient.addColorStop(0, `rgba(33, 150, 243, ${alpha * 0.3})`);
                trailGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = trailGradient;
                ctx.fill();
            });

            // Ball
            ctx.save();
            ctx.translate(ball.x, ball.y);
            ctx.rotate(ball.rotation);

            // Ball shadow
            ctx.beginPath();
            ctx.arc(3, 3, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();

            // Main ball / power-up effect
            ctx.beginPath();
            ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
            const ballGradient = ctx.createRadialGradient(
                -ball.radius/3, -ball.radius/3, ball.radius/4,
                0, 0, ball.radius
            );

            if (ball.powerUp) {
                if (ball.powerUpType === 'invincibility') {
                    ballGradient.addColorStop(0, '#ffd700');
                    ballGradient.addColorStop(0.5, '#ff6b6b');
                    ballGradient.addColorStop(1, '#ff4081');
                } else {
                    ballGradient.addColorStop(0, '#00ffff');
                    ballGradient.addColorStop(0.5, '#1e90ff');
                    ballGradient.addColorStop(1, '#0000ff');
                }
                
                // Glow effect during power-up
                ctx.shadowColor = ball.powerUpType === 'invincibility' ? '#ffd700' : '#00ffff';
                ctx.shadowBlur = 20;
            } else {
                ballGradient.addColorStop(0, '#64b5f6');
                ballGradient.addColorStop(1, '#1976d2');
            }
            
            ctx.fillStyle = ballGradient;
            ctx.fill();
            
            // Metallic shine effect
            ctx.beginPath();
            ctx.arc(-ball.radius/3, -ball.radius/3, ball.radius/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
            
            ctx.restore();
        }

        function drawParticles() {
            particles.forEach((particle, index) => {
                particle.life--;
                if (particle.life <= 0) {
                    particles.splice(index, 1);
                } else {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                    
                    // Gradient particle
                    const particleGradient = ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.radius
                    );
                    particleGradient.addColorStop(0, `rgba(${particle.color}, ${particle.alpha})`);
                    particleGradient.addColorStop(1, `rgba(${particle.color}, 0)`);
                    
                    ctx.fillStyle = particleGradient;
                    ctx.fill();
                    
                    // Particle physics
                    particle.x += particle.dx;
                    particle.y += particle.dy;
                    particle.dy += 0.1;
                    particle.alpha = particle.life / 60;
                }
            });
        }

        function drawScore() {
            scoreDisplay.textContent = score;
            highScoreDisplay.textContent = `High Score: ${highScore}`;
            levelDisplay.textContent = `Level: ${level}`;
        }

        function updateGame() {
            if (!isPlaying || isPaused) return;

            frameCount++;

            // Ball physics
            ball.y += ball.dy;
            ball.dy += 0.4;
            ball.rotation += ball.dy * 0.02;

            // Ball trail
            ball.trail.push({x: ball.x, y: ball.y});
            if (ball.trail.length > 10) ball.trail.shift();

            // Power-up status
            if (ball.powerUp) {
                ball.powerUpTime--;
                if (ball.powerUpTime <= 0) {
                    ball.powerUp = false;
                    ball.powerUpType = null;
                    powerUpIndicator.style.display = 'none';
                    powerUpIndicator.classList.remove('power-active');
                    if (ball.powerUpType === 'slowMotion') {
                        gameSpeed *= 2;
                    }
                }
            }

            // Spawn power-ups
            if (frameCount % 300 === 0 && Math.random() < 0.3) {
                powerUps.push(new PowerUp());
            }

            powerUps.forEach((powerUp, index) => {
                powerUp.update();
                if (powerUp.x < -50) {
                    powerUps.splice(index, 1);
                }

                const dx = powerUp.x - ball.x;
                const dy = powerUp.y - ball.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ball.radius + powerUp.radius && !powerUp.collected) {
                    powerUp.collected = true;
                    powerUps.splice(index, 1);
                    activatePowerUp(powerUp.type);
                }
            });

            obstacles.forEach(obstacle => obstacle.x -= gameSpeed);
            obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);

            // Spawn new obstacles
            if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 200) {
                const gap = 180 - (level * 5);
                const topHeight = Math.random() * (canvas.height - gap - 100) + 50;
                obstacles.push(new Obstacle(canvas.width, topHeight, gap));
            }

            // Collisions
            const collision = obstacles.some(obstacle => {
                if (!ball.powerUp || ball.powerUpType !== 'invincibility') {
                    if (ball.x + ball.radius > obstacle.x &&
                        ball.x - ball.radius < obstacle.x + obstacle.width &&
                        (ball.y - ball.radius < obstacle.topHeight || 
                         ball.y + ball.radius > canvas.height - obstacle.bottomHeight)) {
                        return true;
                    }
                }
                return false;
            });

            if (collision || (!ball.powerUp && (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0))) {
                gameOver();
            }

            // Update score
            obstacles.forEach(obstacle => {
                if (ball.x > obstacle.x + obstacle.width && !obstacle.passed) {
                    score++;
                    obstacle.passed = true;
                    createScoreEffect();
                    
                    // Level up every 10 points
                    if (score % 10 === 0) {
                        level++;
                        gameSpeed += 0.5;
                    }
                }
            });
        }

        function activatePowerUp(type) {
            ball.powerUp = true;
            ball.powerUpType = type;
            ball.powerUpTime = 300; // 5 seconds at 60fps
            powerUpIndicator.style.display = 'block';
            powerUpIndicator.classList.add('power-active');
            
            if (type === 'invincibility') {
                powerUpIndicator.textContent = 'Invincibility!';
            } else if (type === 'slowMotion') {
                powerUpIndicator.textContent = 'Slow Motion!';
                gameSpeed /= 2; // Slow down the game
            }
            
            // Power-up activation particles
            for (let i = 0; i < 20; i++) {
                particles.push(createParticle(ball.x, ball.y, type === 'invincibility' ? '255, 215, 0' : '0, 255, 255'));
            }
        }

        function createScoreEffect() {
            for (let i = 0; i < 10; i++) {
                particles.push(createParticle(ball.x, ball.y, '33, 150, 243'));
            }
        }

        function gameOver() {
            isPlaying = false;
            
            // Explosion effect
            for (let i = 0; i < 30; i++) {
                particles.push(createParticle(ball.x, ball.y, '255, 87, 34'));
            }
            
            // Update high score
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('highScore', highScore);
            }
            
            finalScoreSpan.textContent = score;
            finalHighScoreSpan.textContent = highScore;
            setTimeout(() => {
                playAgainScreen.style.display = 'block';
            }, 1000);
        }

        function drawGame() {
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background particles
            drawParticles();
            
            // Draw obstacles
            obstacles.forEach(obstacle => obstacle.draw());
            
            // Draw power-ups
            powerUps.forEach(powerUp => powerUp.draw());
            
            // Draw ball
            drawBall();
            
            // Draw score
            drawScore();
        }

        function gameStep() {
            updateGame();
            drawGame();
            requestAnimationFrame(gameStep);
        }

        function resetGame() {
            ball = {
                x: 100,
                y: 300,
                radius: 20,
                dy: 0,
                rotation: 0,
                trail: [],
                powerUp: false,
                powerUpTime: 0,
                powerUpType: null
            };
            obstacles = [];
            particles = [];
            powerUps = [];
            score = 0;
            level = 1;
            gameSpeed = 3;
            isPlaying = true;
            isPaused = false;
            frameCount = 0;
            playAgainScreen.style.display = 'none';
            pauseScreen.style.display = 'none';
            powerUpIndicator.style.display = 'none';
            powerUpIndicator.classList.remove('power-active');
        }

        // Event listeners
        canvas.addEventListener('touchstart', handleInput);
        canvas.addEventListener('mousedown', handleInput);
        document.addEventListener('keydown', e => {
            if (e.code === 'Space') handleInput(e);
        });

        function handleInput(e) {
            e.preventDefault();
            if (isPlaying && !isPaused) {
                ball.dy = -8;
                // Jump particles
                for (let i = 0; i < 5; i++) {
                    particles.push(createParticle(
                        ball.x,
                        ball.y + ball.radius,
                        ball.powerUp ? (ball.powerUpType === 'invincibility' ? '255, 215, 0' : '0, 255, 255') : '33, 150, 243'
                    ));
                }
            }
        }

        // Initialize
        startButton.addEventListener('click', () => {
            startScreen.style.display = 'none';
            resetGame();
            requestAnimationFrame(gameStep);
        });

        playAgainButton.addEventListener('click', resetGame);

        // Pause
        pauseButton.addEventListener('click', togglePause);
        document.addEventListener('keydown', e => {
            if (e.code === 'Escape') togglePause();
        });

        function togglePause() {
            if (isPlaying) {
                isPaused = !isPaused;
                if (isPaused) {
                    pauseScreen.style.display = 'block';
                } else {
                    pauseScreen.style.display = 'none';
                }
            }
        }

        document.getElementById('resumeButton').addEventListener('click', () => {
            if (isPaused) {
                togglePause();
            }
        });

        // Initial draw
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);