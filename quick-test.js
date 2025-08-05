#!/usr/bin/env node

/**
 * 빠른 테스트를 위한 스크립트
 */

const { spawn } = require('child_process');
const path = require('path');

async function quickTest() {
    console.log('🚀 HWP 클라이언트 빠른 테스트');
    
    const client = spawn('npx', ['tsx', 'src/index.ts'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
    });

    // 몇 초 후에 자동으로 테스트 입력을 보냄
    setTimeout(() => {
        console.log('\n자동 테스트 시작...');
        client.stdin.write('새 HWP 문서를 만들어줘\n');
        
        setTimeout(() => {
            client.stdin.write('제목으로 "자동 테스트 문서"를 입력해줘\n');
            
            setTimeout(() => {
                client.stdin.write('quit\n');
            }, 3000);
        }, 3000);
    }, 5000);

    client.on('close', (code) => {
        console.log(`\n✅ 테스트 완료 (코드: ${code})`);
    });
}

quickTest();