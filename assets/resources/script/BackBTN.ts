import { _decorator, Component, director, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BackBTN')
export class BackBTN extends Component {
    start() {
        // 自身點擊後返回主畫面
        this.node.on('click', ()=> director.loadScene("Index"), this);
    }

    update(deltaTime: number) {
        
    }
}

