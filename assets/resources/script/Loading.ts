import { _decorator, Component, Label, Node, resources, ProgressBar,director } from 'cc';
import { Constants } from './constants';
const { ccclass, property } = _decorator;

@ccclass('Loading')
export class Loading extends Component {
    @property(ProgressBar)
    progressBar: ProgressBar = null;
    @property(Label)
    text: Label = null;
    @property(Node)
    PersistRoot: Node = null;

    private _progress: number = 0;

    initPopupLayer(){
        director.addPersistRootNode(this.PersistRoot);
    }
    loadLocalGameConfig(){
        resources.loadDir(Constants.configPath, (finished:number, total:number,item:any) => {
            let p = 80 / total;
            this._progress += p;
            this.setProgressBar();
        }, (err, assets) => {
            this.initData();
        })
    }
    setProgressBar(progress?: number) {
        this.text.string = `Loading... ${Math.floor(progress * 100)}%`;
        this.progressBar.progress = progress;
    }

    initData() {
        this.preloadScene();
    }

    preloadScene() {
        let sceneName = "Game";
        director.preloadScene(sceneName, (completedCount, totalCount, item) => {
            let p = 20 / totalCount;
            if(this._progress < 80 + p) {
                this._progress =80+ p;
            }
        }, (err) => {
            this._progress = 100;
            this.setProgressBar();
            director.loadScene(sceneName);
        });
    }

    protected onLoad(): void {
        this.initPopupLayer();
        this.loadLocalGameConfig();
    }
    start() {

    }

    update(deltaTime: number) {
        
    }
}

