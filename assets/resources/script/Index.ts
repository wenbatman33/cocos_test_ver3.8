import { _decorator, Component, Node, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Index')
export class Index extends Component {
    @property(Node)
    btn_1: Node = null;
    
    @property(Node)
    btn_2: Node = null;

    start() {
        this.btn_1.on('click', this.onBtn1Click, this);
        this.btn_2.on('click', this.onBtn2Click, this);
    }
    onBtn1Click() {
        director.loadScene("Carousel");
    }
    onBtn2Click() {
        director.loadScene("stage_2");
    }   

    update(deltaTime: number) {
        
    }
}

