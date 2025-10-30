import { 
    _decorator, 
    Component, 
    Node, 
    Prefab, 
    instantiate, 
    UITransform, 
    Vec3, 
    tween, 
    Tween, 
    EventTouch, 
    input, 
    Input,
    Enum,
    clamp,
    Label,
    Color,
    Size
} from 'cc';

const { ccclass, property } = _decorator;

enum Direction {
    HORIZONTAL = 0,
    VERTICAL = 1
}

Enum(Direction);

// 配置常量
const CAROUSEL_CONFIG = {
    DEFAULT_SIZE: { width: 750, height: 1334 },
    DEFAULT_COLORS: [
        new Color(255, 120, 120), new Color(120, 255, 120), new Color(120, 120, 255),
        new Color(255, 255, 120), new Color(255, 120, 255), new Color(120, 255, 255),
        new Color(255, 180, 120), new Color(180, 120, 255)
    ]
};

@ccclass('Carousel')
export class Carousel extends Component {
    @property({ type: [Node], tooltip: '頁面節點列表' })
    pages: Node[] = [];

    @property({ type: Prefab, tooltip: '頁面預製體' })
    pagePrefab: Prefab = null;

    @property({ type: Direction, tooltip: '滑動方向' })
    direction: Direction = Direction.HORIZONTAL;

    @property({ tooltip: '自動播放' })
    autoPlay: boolean = false;

    @property({ tooltip: '自動播放間隔(秒)', visible() { return this.autoPlay; } })
    autoPlayInterval: number = 3;

    @property({ tooltip: '滑動動畫時長(秒)' })
    animationDuration: number = 0.3;

    @property({ tooltip: '滑動閾值(0-1)' })
    slideThreshold: number = 0.3;

    @property({ tooltip: '回彈動畫時長(秒)' })
    bounceBackDuration: number = 0.2;

    @property({ tooltip: '動態創建頁面數量' })
    dynamicPageCount: number = 3;

    @property({ tooltip: '自動動態創建頁面' })
    autoDynamicCreate: boolean = true;

    private currentIndex: number = 0;
    private totalPages: number = 0;
    private pageSize: number = 0;
    private isDragging: boolean = false;
    private startTouchPos: Vec3 = new Vec3();
    private lastTouchPos: Vec3 = new Vec3();
    private contentStartPos: Vec3 = new Vec3();
    private autoPlayTimer: number = 0;
    private currentTween: Tween<Node> = null;

    // 無限滑動相關
    private clonedPages: Node[] = [];
    private actualIndex: number = 0; // 實際顯示的頁面索引

    start() {
        // 檢查是否需要動態創建頁面
        if (this.autoDynamicCreate) {
            // 如果沒有設置任何頁面，或者現有頁面是空的，則動態創建
            const hasEmptyPages = this.pages.length > 0 && this.pages.every(page => page.children.length === 0);
            const hasNoPages = this.pages.length === 0 && this.node.children.length === 0;
            
            if (hasNoPages) {
                this.createDynamicPages();
            } else if (hasEmptyPages) {
                this.addContentToExistingPages();
            } else {
                this.setupExistingPages();
            }
        } else {
            this.setupExistingPages(); // 處理現有頁面
        }
        
        this.initializeCarousel();
        this.setupTouchEvents();
        
        if (this.autoPlay) {
            this.startAutoPlay();
        }
    }

    private setupExistingPages() {
        // 檢查是否已經有子節點但沒有設置到 pages 數組中
        const children = this.node.children;
        
        // 情況1：Pages 數組已經設置，但子節點為空（說明頁面節點還沒有內容）
        if (this.pages.length > 0 && children.length === 0) {
            return;
        }
        
        // 情況2：有子節點但 Pages 數組為空，自動添加
        if (children.length > 0 && this.pages.length === 0) {
            this.pages = [...children];
        }
        
        // 情況3：Pages 數組和子節點都有，檢查內容並添加
        if (this.pages.length > 0) {
            this.addContentToExistingPages();
        }
    }

    private createDynamicPages() {
        // 設置容器大小
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        if (transform.width === 0 || transform.height === 0) {
            transform.setContentSize(CAROUSEL_CONFIG.DEFAULT_SIZE.width, CAROUSEL_CONFIG.DEFAULT_SIZE.height);
        }

        // 清空現有頁面
        this.pages = [];
        this.node.removeAllChildren();

        for (let i = 0; i < this.dynamicPageCount; i++) {
            const page = this.createSingleDynamicPage(i, CAROUSEL_CONFIG.DEFAULT_COLORS[i % CAROUSEL_CONFIG.DEFAULT_COLORS.length], transform.contentSize);
            this.node.addChild(page);
            this.pages.push(page);
        }
    }

    private createSingleDynamicPage(index: number, color: Color, pageSize: any): Node {
        const page = new Node(`DynamicPage_${index + 1}`);
        
        // 設置頁面大小
        const pageTransform = page.addComponent(UITransform);
        pageTransform.setContentSize(pageSize);
        
        // 創建頁面元素
        this.createPageElement(page, 'Title', `動態頁面 ${index + 1}`, new Vec3(0, 200, 0), { width: 400, height: 80 }, 48, color);
        this.createPageElement(page, 'Description', `這是動態創建的第 ${index + 1} 頁\n可以左右滑動切換`, new Vec3(0, 100, 0), { width: 500, height: 60 }, 24, new Color(200, 200, 200));
        this.createPageElement(page, 'Indicator', `${index + 1} / ${this.dynamicPageCount}`, new Vec3(0, 0, 0), { width: 200, height: 40 }, 32, new Color(150, 150, 150));
        
        // 創建按鈕
        const buttonNode = this.createPageElement(page, 'TestButton', '點擊下一頁 →', new Vec3(0, -100, 0), { width: 250, height: 60 }, 28, new Color(255, 255, 255));
        buttonNode.on(Input.EventType.TOUCH_END, () => this.nextPage(), this);
        
        // 創建滑動提示
        this.createPageElement(page, 'SwipeHint', '← 滑動試試 →', new Vec3(0, -200, 0), { width: 300, height: 40 }, 20, new Color(100, 100, 100));
        
        return page;
    }

    private createPageElement(parent: Node, name: string, text: string, position: Vec3, size: { width: number, height: number }, fontSize: number, color: Color): Node {
        const element = new Node(name);
        parent.addChild(element);
        element.position = position;
        
        const transform = element.addComponent(UITransform);
        transform.setContentSize(size.width, size.height);
        
        const label = element.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.color = color;
        
        return element;
    }

    private addContentToExistingPages() {
        this.pages.forEach((page, index) => {
            if (!page?.isValid || page.getChildByName('TestLabel') || page.getChildByName('Title')) return;
            
            this.setupPageTransform(page);
            this.createPageElement(page, 'TestLabel', `${page.name}\n✨ 動態內容 ✨\n頁面 ${index + 1}/${this.pages.length}`, new Vec3(0, 0, 0), { width: 400, height: 120 }, 36, CAROUSEL_CONFIG.DEFAULT_COLORS[index % CAROUSEL_CONFIG.DEFAULT_COLORS.length]);
            
            const buttonNode = this.createPageElement(page, 'TestButton', '點我切換到下一頁 →', new Vec3(0, -150, 0), { width: 300, height: 80 }, 28, new Color(255, 255, 255));
            buttonNode.on(Input.EventType.TOUCH_END, () => this.nextPage(), this);
            
            this.createPageElement(page, 'SwipeHint', '← 左右滑動試試 →', new Vec3(0, -250, 0), { width: 300, height: 40 }, 20, new Color(150, 150, 150));
        });
    }

    private setupPageTransform(page: Node): void {
        let pageTransform = page.getComponent(UITransform);
        if (!pageTransform) {
            pageTransform = page.addComponent(UITransform);
        }
        
        const containerTransform = this.node.getComponent(UITransform);
        const size = (containerTransform?.width > 0) ? containerTransform.contentSize : new Size(CAROUSEL_CONFIG.DEFAULT_SIZE.width, CAROUSEL_CONFIG.DEFAULT_SIZE.height);
        pageTransform.setContentSize(size);
    }

    private initializeCarousel() {
        // 檢查頁面設置
        if (this.pages.length === 0) {
            if (this.pagePrefab) {
                console.warn('沒有設置頁面節點，但有設置 pagePrefab。請手動創建頁面或在 pages 數組中添加頁面節點');
            } else {
                // 只有在沒有任何子節點的情況下才創建默認頁面
                if (this.node.children.length === 0) {
                    console.warn('沒有設置頁面，自動創建默認測試頁面');
                    this.createDefaultPages();
                } else {
                    console.warn('檢測到子節點但未設置到 pages 數組，請檢查 setupExistingPages 方法');
                }
            }
        }

        // 如果仍然沒有頁面，直接返回
        if (this.pages.length === 0) {
            return;
        }

        // 檢查頁面節點是否有效
        const validPages = this.pages.filter(page => page != null);
        if (validPages.length !== this.pages.length) {
            console.warn('pages 數組中存在空的節點，已過濾掉空節點');
            this.pages = validPages;
        }

        this.totalPages = this.pages.length;
        
        if (this.totalPages === 0) {
            console.error('所有頁面節點都為空，無法初始化 Carousel');
            return;
        }

        if (this.totalPages < 2) {
            console.warn('頁面數量少於2個，無限滑動效果可能不明顯');
            // 即使少於2個頁面也繼續初始化，但不設置無限滾動
            this.updatePageSize();
            this.goToPage(0, false);
            return;
        }

        this.setupInfiniteScroll();
        this.updatePageSize();
        this.goToPage(0, false);
    }

    private createDefaultPages() {
        this.setupNodeTransform();
        
        const transform = this.node.getComponent(UITransform);
        const pageNames = ['頁面 1', '頁面 2', '頁面 3'];

        for (let i = 0; i < 3; i++) {
            const page = new Node(`DefaultPage_${i + 1}`);
            this.setupPageTransform(page);
            
            // 創建背景和標籤
            this.createPageElement(page, 'Background', '', new Vec3(0, 0, 0), { width: transform.width, height: transform.height }, 0, new Color(255, 255, 255));
            this.createPageElement(page, 'Label', pageNames[i], new Vec3(0, 0, 0), { width: 300, height: 100 }, 48, new Color(255, 255, 255));
            
            this.node.addChild(page);
            this.pages.push(page);
        }
    }

    private setupNodeTransform(): void {
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        if (transform.width === 0 || transform.height === 0) {
            transform.setContentSize(CAROUSEL_CONFIG.DEFAULT_SIZE.width, CAROUSEL_CONFIG.DEFAULT_SIZE.height);
        }
    }

    private setupInfiniteScroll() {
        // 清除之前的克隆頁面
        this.clonedPages.forEach(page => {
            if (page && page.isValid) {
                page.destroy();
            }
        });
        this.clonedPages = [];

        // 檢查是否有足夠的頁面進行無限滾動
        if (this.totalPages < 2) {
            console.warn('頁面數量不足，跳過無限滾動設置');
            this.actualIndex = 0;
            return;
        }

        // 檢查頁面節點是否有效
        const lastPage = this.pages[this.totalPages - 1];
        const firstPage = this.pages[0];

        if (!lastPage || !firstPage) {
            console.error('頁面節點無效，無法設置無限滾動');
            this.actualIndex = 0;
            return;
        }

        try {
            // 在開頭添加最後一頁的克隆
            const lastPageClone = instantiate(lastPage);
            this.node.insertChild(lastPageClone, 0);
            this.clonedPages.push(lastPageClone);

            // 在結尾添加第一頁的克隆
            const firstPageClone = instantiate(firstPage);
            this.node.addChild(firstPageClone);
            this.clonedPages.push(firstPageClone);

            // 更新實際索引（因為在開頭添加了一頁）
            this.actualIndex = 1;
        } catch (error) {
            console.error('設置無限滾動時發生錯誤:', error);
            // 如果克隆失敗，回退到簡單模式
            this.actualIndex = 0;
        }
    }

    private updatePageSize() {
        const transform = this.node.getComponent(UITransform);
        this.pageSize = (this.direction === Direction.HORIZONTAL) ? transform.width : transform.height;

        // 更新所有頁面的位置
        this.updateAllPagesPosition();
    }

    private updateAllPagesPosition() {
        const children = this.node.children;
        
        for (let i = 0; i < children.length; i++) {
            const page = children[i];
            if (this.direction === Direction.HORIZONTAL) {
                const newX = (i - this.actualIndex) * this.pageSize;
                page.position = new Vec3(newX, 0, 0);
            } else {
                const newY = -(i - this.actualIndex) * this.pageSize;
                page.position = new Vec3(0, newY, 0);
            }
        }
    }

    private setupTouchEvents() {
        // 確保節點有 UITransform 組件
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        
        // 設置觸摸事件
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        
        // 全局觸摸事件（備用方案）
        input.on(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    }

    // 全局觸摸事件處理（備用方案）
    private onGlobalTouchStart(event: EventTouch) {
        this.onTouchStart(event);
    }

    private onGlobalTouchMove(event: EventTouch) {
        if (this.isDragging) {
            this.onTouchMove(event);
        }
    }

    private onGlobalTouchEnd(event: EventTouch) {
        if (this.isDragging) {
            this.onTouchEnd(event);
        }
    }

    private onTouchStart(event: EventTouch) {
        this.isDragging = true;
        this.startTouchPos.set(event.getUILocation().x, event.getUILocation().y, 0);
        this.lastTouchPos.set(this.startTouchPos);
        this.contentStartPos.set(this.node.position);
        
        // 停止當前動畫
        if (this.currentTween) {
            this.currentTween.stop();
        }

        // 停止自動播放
        if (this.autoPlay) {
            this.stopAutoPlay();
        }
    }

    private onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;

        const currentPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const deltaPos = new Vec3();
        Vec3.subtract(deltaPos, currentPos, this.lastTouchPos);

        // 移動內容
        const newPos = new Vec3(this.node.position);
        if (this.direction === Direction.HORIZONTAL) {
            newPos.x += deltaPos.x;
        } else {
            newPos.y += deltaPos.y;
        }
        this.node.position = newPos;

        this.lastTouchPos.set(currentPos);
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.isDragging) return;
        
        this.isDragging = false;

        const endPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const totalDelta = new Vec3();
        Vec3.subtract(totalDelta, endPos, this.startTouchPos);

        const deltaDistance = this.direction === Direction.HORIZONTAL ? totalDelta.x : totalDelta.y;
        const threshold = this.pageSize * this.slideThreshold;

        console.log('滑動距離:', deltaDistance, '閾值:', threshold);

        if (Math.abs(deltaDistance) > threshold) {
            // 滑動距離足夠，切換頁面
            if (deltaDistance > 0) {
                this.previousPage();
            } else {
                this.nextPage();
            }
        } else {
            // 滑動距離不足，回彈到當前頁面
            this.snapToCurrentPage();
        }

        // 重新開始自動播放
        if (this.autoPlay) {
            this.startAutoPlay();
        }
    }

    public nextPage() {
        if (this.totalPages === 0) {
            console.warn('沒有頁面可以切換');
            return;
        }

        if (this.clonedPages.length > 0) {
            // 無限滾動模式
            this.actualIndex++;
        } else {
            // 簡單模式，有邊界限制
            if (this.currentIndex < this.totalPages - 1) {
                this.actualIndex++;
                this.currentIndex++;
            } else {
                // 到達最後一頁，跳轉到第一頁
                this.actualIndex = 0;
                this.currentIndex = 0;
            }
        }
        this.goToActualIndex(true);
    }

    public previousPage() {
        if (this.totalPages === 0) {
            console.warn('沒有頁面可以切換');
            return;
        }

        if (this.clonedPages.length > 0) {
            // 無限滾動模式
            this.actualIndex--;
        } else {
            // 簡單模式，有邊界限制
            if (this.currentIndex > 0) {
                this.actualIndex--;
                this.currentIndex--;
            } else {
                // 到達第一頁，跳轉到最後一頁
                this.actualIndex = this.totalPages - 1;
                this.currentIndex = this.totalPages - 1;
            }
        }
        this.goToActualIndex(true);
    }

    public goToPage(index: number, animated: boolean = true) {
        if (this.totalPages === 0) {
            console.warn('沒有頁面可以跳轉');
            return;
        }

        this.currentIndex = clamp(index, 0, this.totalPages - 1);
        
        if (this.clonedPages.length > 0) {
            // 無限滾動模式，actualIndex 需要加1（因為開頭有克隆頁面）
            this.actualIndex = this.currentIndex + 1;
        } else {
            // 簡單模式
            this.actualIndex = this.currentIndex;
        }
        
        this.goToActualIndex(animated);
    }

    private goToActualIndex(animated: boolean = true) {
        const targetPos = new Vec3();
        if (this.direction === Direction.HORIZONTAL) {
            targetPos.x = -this.actualIndex * this.pageSize;
        } else {
            targetPos.y = this.actualIndex * this.pageSize;
        }

        if (animated) {
            this.currentTween = tween(this.node)
                .to(this.animationDuration, { position: targetPos })
                .call(() => {
                    this.checkInfiniteScrollBounds();
                })
                .start();
        } else {
            this.node.position = targetPos;
            this.checkInfiniteScrollBounds();
        }
    }

    private checkInfiniteScrollBounds() {
        const children = this.node.children;
        
        // 只有在設置了無限滾動的情況下才進行邊界檢查
        if (this.clonedPages.length === 0) {
            // 簡單模式，直接更新索引
            this.currentIndex = Math.max(0, Math.min(this.actualIndex, this.totalPages - 1));
            return;
        }
        
        if (this.actualIndex >= children.length - 1) {
            // 到達最後一個克隆頁面，跳轉到真實的第一頁
            this.actualIndex = 1;
            this.currentIndex = 0;
            this.jumpToActualIndex();
        } else if (this.actualIndex <= 0) {
            // 到達第一個克隆頁面，跳轉到真實的最後一頁
            this.actualIndex = this.totalPages;
            this.currentIndex = this.totalPages - 1;
            this.jumpToActualIndex();
        } else {
            // 更新當前頁面索引
            this.currentIndex = this.actualIndex - 1;
        }
    }

    private jumpToActualIndex() {
        const targetPos = new Vec3();
        if (this.direction === Direction.HORIZONTAL) {
            targetPos.x = -this.actualIndex * this.pageSize;
        } else {
            targetPos.y = this.actualIndex * this.pageSize;
        }
        this.node.position = targetPos;
    }

    private snapToCurrentPage() {
        this.currentTween = tween(this.node)
            .to(this.bounceBackDuration, { 
                position: this.direction === Direction.HORIZONTAL 
                    ? new Vec3(-this.actualIndex * this.pageSize, 0, 0)
                    : new Vec3(0, this.actualIndex * this.pageSize, 0)
            })
            .start();
    }

    private startAutoPlay() {
        this.autoPlayTimer = 0;
    }

    private stopAutoPlay() {
        this.autoPlayTimer = 0;
    }

    update(deltaTime: number) {
        if (this.autoPlay && !this.isDragging && this.totalPages > 1) {
            this.autoPlayTimer += deltaTime;
            if (this.autoPlayTimer >= this.autoPlayInterval) {
                this.nextPage();
                this.autoPlayTimer = 0;
            }
        }
    }

    // 公共 API
    public getCurrentPageIndex(): number {
        return this.currentIndex;
    }

    public getTotalPages(): number {
        return this.totalPages;
    }

    public setAutoPlay(enabled: boolean) {
        this.autoPlay = enabled;
        if (enabled) {
            this.startAutoPlay();
        } else {
            this.stopAutoPlay();
        }
    }

    // 動態頁面管理 API
    public addPage(pageContent?: string): void {
        console.log('➕ 動態添加新頁面');
        
        const transform = this.node.getComponent(UITransform);
        const colors = [
            new Color(255, 120, 120), new Color(120, 255, 120), new Color(120, 120, 255),
            new Color(255, 255, 120), new Color(255, 120, 255), new Color(120, 255, 255),
        ];
        
        const pageIndex = this.pages.length;
        const color = colors[pageIndex % colors.length];
        const content = pageContent || `新頁面 ${pageIndex + 1}`;
        
        const newPage = this.createSingleDynamicPage(pageIndex, color, transform.contentSize);
        
        // 更新標題為自定義內容
        const titleLabel = newPage.getChildByName('Title')?.getComponent(Label);
        if (titleLabel) {
            titleLabel.string = content;
        }
        
        this.node.addChild(newPage);
        this.pages.push(newPage);
        this.totalPages = this.pages.length;
        
        // 重新初始化
        this.setupInfiniteScroll();
        this.updatePageSize();
        
        console.log(`✅ 已添加頁面: ${content}，總計 ${this.totalPages} 頁`);
    }

    public removePage(index: number): void {
        if (index < 0 || index >= this.pages.length) {
            console.warn('頁面索引超出範圍');
            return;
        }
        
        console.log(`➖ 移除頁面 ${index + 1}`);
        
        const pageToRemove = this.pages[index];
        pageToRemove.destroy();
        this.pages.splice(index, 1);
        this.totalPages = this.pages.length;
        
        // 調整當前頁面索引
        if (this.currentIndex >= this.totalPages) {
            this.currentIndex = Math.max(0, this.totalPages - 1);
        }
        
        // 重新初始化
        this.setupInfiniteScroll();
        this.updatePageSize();
        this.goToPage(this.currentIndex, false);
        
        console.log(`✅ 已移除頁面，剩餘 ${this.totalPages} 頁`);
    }

    public clearAllPages(): void {
        console.log('🗑️ 清空所有頁面');
        
        this.pages.forEach(page => page.destroy());
        this.clonedPages.forEach(page => page.isValid && page.destroy());
        
        this.pages = [];
        this.clonedPages = [];
        this.totalPages = 0;
        this.currentIndex = 0;
        this.actualIndex = 0;
        
        console.log('✅ 所有頁面已清空');
    }

    public recreateDynamicPages(count?: number): void {
        console.log('🔄 重新創建動態頁面');
        
        this.clearAllPages();
        this.dynamicPageCount = count || this.dynamicPageCount;
        this.createDynamicPages();
        this.initializeCarousel();
        
        console.log(`✅ 重新創建完成，共 ${this.totalPages} 頁`);
    }

    protected onDestroy() {
        // 清理節點事件監聽
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        // 清理全局事件監聽
        input.off(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);

        // 停止動畫
        if (this.currentTween) {
            this.currentTween.stop();
        }
        
        console.log('🧹 Carousel 事件清理完成');
    }
}

