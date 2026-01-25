import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

// Dummy data for screenshot
const DUMMY_DATA = {
  projects: [
    {
      id: 'proj-1',
      name: 'Product Launch',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'proj-2',
      name: 'Mobile App',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ],
  lists: [
    // Product Launch lists
    { id: 'list-1', projectId: 'proj-1', name: 'Backlog', position: 0 },
    { id: 'list-2', projectId: 'proj-1', name: 'In Progress', position: 1 },
    { id: 'list-3', projectId: 'proj-1', name: 'Review', position: 2 },
    { id: 'list-4', projectId: 'proj-1', name: 'Done', position: 3 },
    // Mobile App lists
    { id: 'list-5', projectId: 'proj-2', name: 'Ideas', position: 0 },
    { id: 'list-6', projectId: 'proj-2', name: 'Development', position: 1 },
    { id: 'list-7', projectId: 'proj-2', name: 'Testing', position: 2 },
  ],
  cards: [
    // Product Launch - Backlog
    {
      id: 'card-1',
      listId: 'list-1',
      title: 'Design landing page',
      description: 'Create mockups for the new landing page with hero section and features.',
      link: 'https://figma.com/design/landing-page',
      coverImageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop',
      position: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'card-2',
      listId: 'list-1',
      title: 'Set up analytics',
      description: 'Integrate analytics to track user behavior.',
      link: 'https://analytics.google.com',
      position: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'card-3',
      listId: 'list-1',
      title: 'Write API documentation',
      description: '',
      position: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    // Product Launch - In Progress
    {
      id: 'card-4',
      listId: 'list-2',
      title: 'Implement authentication',
      description: 'Add login and signup flows with OAuth support.',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      link: 'https://auth0.com/docs',
      position: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'card-5',
      listId: 'list-2',
      title: 'Build dashboard UI',
      description: 'Create the main dashboard with charts and metrics.',
      coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop',
      position: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    // Product Launch - Review
    {
      id: 'card-6',
      listId: 'list-3',
      title: 'Database schema review',
      description: 'Review and optimize the database schema for production.',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      position: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    // Product Launch - Done
    {
      id: 'card-7',
      listId: 'list-4',
      title: 'Project setup',
      description: 'Initialize repository with CI/CD pipeline.',
      link: 'https://docs.docker.com/get-started/',
      position: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'card-8',
      listId: 'list-4',
      title: 'Design system',
      description: 'Create component library with tokens.',
      position: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    // Mobile App - Ideas
    {
      id: 'card-9',
      listId: 'list-5',
      title: 'Push notifications',
      description: 'Add support for push notifications on iOS and Android.',
      position: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: 'card-10',
      listId: 'list-5',
      title: 'Offline mode',
      description: '',
      position: 1,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    // Mobile App - Development
    {
      id: 'card-11',
      listId: 'list-6',
      title: 'User profile screen',
      description: 'Implement profile editing and avatar upload.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      position: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    // Mobile App - Testing
    {
      id: 'card-12',
      listId: 'list-7',
      title: 'Beta testing feedback',
      description: 'Collect and analyze feedback from beta testers.',
      position: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ],
};

async function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') && !started) {
        started = true;
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`Server stderr: ${data}`);
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error('Server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

async function takeScreenshot() {
  console.log('Starting preview server...');
  const server = await startPreviewServer();

  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 2, // Retina quality
    });

    // Inject localStorage data before navigating
    await page.evaluateOnNewDocument((data) => {
      localStorage.setItem('board-data', JSON.stringify(data));
    }, DUMMY_DATA);

    console.log('Loading page...');
    await page.goto('http://localhost:4173', {
      waitUntil: 'networkidle0',
    });

    // Wait a bit for any animations to settle
    await new Promise((r) => setTimeout(r, 500));

    console.log('Taking screenshot...');
    const screenshotPath = path.join(ROOT_DIR, 'docs', 'screenshot.png');
    await page.screenshot({
      path: screenshotPath,
      type: 'png',
    });

    console.log(`Screenshot saved to ${screenshotPath}`);

    await browser.close();
  } finally {
    server.kill();
  }
}

takeScreenshot().catch((err) => {
  console.error('Screenshot failed:', err);
  process.exit(1);
});
